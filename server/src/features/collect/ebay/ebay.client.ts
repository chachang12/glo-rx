import { getAccessToken } from './ebay.auth.js'
import { buildQueryParams, cacheKey } from './ebay.filters.js'
import { RateCounterModel, todayUtcKey } from './rate-counter.model.js'
import type {
  AspectDistribution,
  CompactItem,
  RawItemSummary,
  RawSearchResponse,
  SearchFilters,
  SearchResult,
} from './ebay.types.js'

const SEARCH_PATH = '/buy/browse/v1/item_summary/search'
const SEARCH_CACHE_TTL_MS = 30 * 1000
const ASPECT_CACHE_TTL_MS = 60 * 60 * 1000

interface CacheEntry<T> { value: T; expiresAt: number }
const searchCache = new Map<string, CacheEntry<SearchResult>>()
const aspectCache = new Map<string, CacheEntry<AspectDistribution[]>>()

export class EbayApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'EbayApiError'
    this.status = status
    this.body = body
  }
}

function buildEndUserContext(): string {
  const campaignId = process.env.EBAY_EPN_CAMPAIGN_ID
  const refId = process.env.EBAY_EPN_REFERENCE_ID
  const country = process.env.EBAY_USER_COUNTRY ?? 'US'
  const zip = process.env.EBAY_USER_ZIP
  const parts: string[] = []
  if (campaignId) parts.push(`affiliateCampaignId=${campaignId}`)
  if (refId) parts.push(`affiliateReferenceId=${refId}`)
  const locParts = [`country=${country}`]
  if (zip) locParts.push(`zip=${zip}`)
  parts.push(`contextualLocation=${locParts.join(',')}`)
  return parts.join(',')
}

function projectItem(raw: RawItemSummary): CompactItem {
  return {
    itemId: raw.itemId,
    legacyItemId: raw.legacyItemId ?? '',
    title: raw.title ?? '',
    affiliateUrl: raw.itemAffiliateWebUrl ?? null,
    webUrl: raw.itemWebUrl ?? '',
    price: raw.price ?? { value: '0', currency: 'USD' },
    condition: raw.condition ?? null,
    conditionId: raw.conditionId ?? null,
    imageUrl: raw.image?.imageUrl ?? null,
    thumbnails: (raw.thumbnailImages ?? raw.additionalImages ?? [])
      .map((t) => t.imageUrl)
      .filter(Boolean),
    seller: raw.seller
      ? {
          username: raw.seller.username,
          feedbackPct: raw.seller.feedbackPercentage,
          feedbackScore: raw.seller.feedbackScore,
        }
      : null,
    itemLocation: raw.itemLocation
      ? {
          country: raw.itemLocation.country,
          postalCode: raw.itemLocation.postalCode ?? null,
          city: raw.itemLocation.city ?? null,
        }
      : null,
    buyingOptions: raw.buyingOptions ?? [],
    currentBidPrice: raw.currentBidPrice ?? null,
    bidCount: raw.bidCount ?? null,
    shippingCost: raw.shippingOptions?.[0]?.shippingCost ?? null,
    category: raw.categories?.[0]
      ? { id: raw.categories[0].categoryId, name: raw.categories[0].categoryName }
      : null,
    itemOriginDate: raw.itemOriginDate ?? raw.itemCreationDate ?? null,
    itemEndDate: raw.itemEndDate ?? null,
    marketingPrice: raw.marketingPrice?.originalPrice
      ? {
          originalPrice: raw.marketingPrice.originalPrice.value,
          discountPct: raw.marketingPrice.discountPercentage ?? '0',
        }
      : null,
  }
}

interface CallStats {
  dailyCalls: number
  resetAt: number
}
const stats: CallStats = { dailyCalls: 0, resetAt: nextUtcMidnight() }
let counterLoaded = false

function nextUtcMidnight(): number {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return next.getTime()
}

/**
 * Loads today's call count from MongoDB into the in-memory counter so the
 * dashboard quota gauge survives server restarts. Idempotent. Safe to call
 * at boot before any traffic arrives.
 */
export async function loadCallStatsFromDB(): Promise<void> {
  if (counterLoaded) return
  try {
    const doc = await RateCounterModel.findOne({ dateKey: todayUtcKey(), scope: 'browse' }).lean()
    if (doc) stats.dailyCalls = doc.count
    counterLoaded = true
    console.log(`[ebay/quota] counter loaded from DB: ${stats.dailyCalls} calls today`)
  } catch (err) {
    console.warn('[ebay/quota] failed to load counter from DB', err)
    counterLoaded = true // don't keep retrying forever
  }
}

export function getCallStats(): { dailyCalls: number; resetAt: number; limit: number } {
  if (Date.now() >= stats.resetAt) {
    stats.dailyCalls = 0
    stats.resetAt = nextUtcMidnight()
  }
  return { dailyCalls: stats.dailyCalls, resetAt: stats.resetAt, limit: 5000 }
}

function recordCall() {
  if (Date.now() >= stats.resetAt) {
    stats.dailyCalls = 0
    stats.resetAt = nextUtcMidnight()
  }
  stats.dailyCalls += 1

  // Fire-and-forget persist so we don't block the search call. Mongo's
  // $inc is atomic, so concurrent calls don't race. If the write fails
  // (network, etc.) we still get the correct count on next boot via
  // loadCallStatsFromDB — at worst we lose visibility of the failed write.
  const dateKey = todayUtcKey()
  RateCounterModel.findOneAndUpdate(
    { dateKey, scope: 'browse' },
    { $inc: { count: 1 }, $setOnInsert: { dateKey, scope: 'browse' } },
    { upsert: true }
  ).catch((err) => console.warn('[ebay/quota] persist failed', err))
}

async function rawSearch(
  filters: SearchFilters,
  opts: { sinceISO?: string; fieldgroups?: string[] }
): Promise<RawSearchResponse> {
  const base = process.env.EBAY_API_BASE ?? 'https://api.ebay.com'
  const marketplace = process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US'
  const token = await getAccessToken()
  const params = buildQueryParams(filters, opts)

  recordCall()
  const res = await fetch(`${base}${SEARCH_PATH}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplace,
      'X-EBAY-C-ENDUSERCTX': buildEndUserContext(),
      Accept: 'application/json',
    },
  })

  const text = await res.text()
  let parsed: unknown = null
  if (text.length > 0) {
    try { parsed = JSON.parse(text) } catch { parsed = text }
  }

  if (!res.ok) {
    const ebayMessage = extractEbayErrorMessage(parsed)
    const message = ebayMessage
      ? `eBay ${res.status}: ${ebayMessage}`
      : `eBay search failed: ${res.status}`
    console.error('[ebay/search]', message, {
      params: params.toString(),
      body: parsed,
    })
    throw new EbayApiError(message, res.status, parsed)
  }

  return (parsed ?? {}) as RawSearchResponse
}

interface EbayErrorBody {
  errors?: Array<{
    errorId?: number
    message?: string
    longMessage?: string
    parameters?: Array<{ name?: string; value?: string }>
  }>
}

function extractEbayErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const errors = (body as EbayErrorBody).errors
  if (!Array.isArray(errors) || errors.length === 0) return null
  return errors
    .map((e) => {
      const base = e.longMessage ?? e.message
      if (!base) return null
      const params = e.parameters?.map((p) => `${p.name}=${p.value}`).join(', ')
      return params ? `${base} (${params})` : base
    })
    .filter(Boolean)
    .join('; ')
}

export interface SearchOptions {
  sinceISO?: string
  aspectRefinements?: boolean
}

export async function searchItems(
  filters: SearchFilters,
  opts: SearchOptions = {}
): Promise<SearchResult> {
  const fieldgroups = opts.aspectRefinements ? ['ASPECT_REFINEMENTS'] : undefined

  // Cache one-shot searches; bypass whenever sinceISO is present (watch polls).
  const useCache = !opts.sinceISO && !opts.aspectRefinements
  const key = useCache ? cacheKey(filters) : null
  if (key) {
    const hit = searchCache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.value
  }

  const raw = await rawSearch(filters, { sinceISO: opts.sinceISO, fieldgroups })

  const result: SearchResult = {
    total: raw.total ?? 0,
    limit: raw.limit ?? filters.limit ?? 50,
    offset: raw.offset ?? filters.offset ?? 0,
    items: (raw.itemSummaries ?? []).map(projectItem),
    next: raw.next ?? null,
    prev: raw.prev ?? null,
    aspectDistributions: raw.refinement?.aspectDistributions ?? null,
    warnings: raw.warnings ?? null,
  }

  if (key) searchCache.set(key, { value: result, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS })
  return result
}

export async function getAspectDistributions(
  categoryId: string,
  q?: string
): Promise<AspectDistribution[]> {
  const cacheK = `${categoryId}::${q ?? ''}`
  const hit = aspectCache.get(cacheK)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  const result = await searchItems(
    { categoryId, q, limit: 1 },
    { aspectRefinements: true }
  )
  const dists = result.aspectDistributions ?? []
  aspectCache.set(cacheK, { value: dists, expiresAt: Date.now() + ASPECT_CACHE_TTL_MS })
  return dists
}
