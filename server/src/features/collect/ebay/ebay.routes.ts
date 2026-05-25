import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import type { AuthEnv } from '../../../types.js'
import {
  EbayApiError,
  getAspectDistributions,
  getCallStats,
  searchItems,
} from './ebay.client.js'
import { WatchModel } from '../watch/watch.model.js'
import type {
  EbayBuyingOption,
  EbayCondition,
  EbaySort,
  SearchFilters,
} from './ebay.types.js'

const CONDITIONS: readonly EbayCondition[] = ['NEW', 'USED', 'UNSPECIFIED']
const BUYING_OPTIONS: readonly EbayBuyingOption[] = ['FIXED_PRICE', 'AUCTION', 'BEST_OFFER']
const SORTS: readonly EbaySort[] = ['newlyListed', 'endingSoonest', 'price', '-price']

function csv(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length ? parts : undefined
}

function num(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function bool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return undefined
}

function parseAspects(raw: string | undefined): Record<string, string[]> | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string[]> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
          if (v.length > 0) out[k] = v
        }
      }
      return Object.keys(out).length ? out : undefined
    }
  } catch {
    // fall through
  }
  return undefined
}

function parseFilters(q: URLSearchParams): SearchFilters {
  const conditions = csv(q.get('conditions') ?? undefined)?.filter(
    (c): c is EbayCondition => (CONDITIONS as readonly string[]).includes(c)
  )
  const buyingOptions = csv(q.get('buyingOptions') ?? undefined)?.filter(
    (b): b is EbayBuyingOption => (BUYING_OPTIONS as readonly string[]).includes(b)
  )
  const sortRaw = q.get('sort') ?? undefined
  const sort = sortRaw && (SORTS as readonly string[]).includes(sortRaw)
    ? (sortRaw as EbaySort)
    : undefined

  const mdcRaw = num(q.get('maxDeliveryCost') ?? undefined)
  const maxDeliveryCost = mdcRaw === 0 ? 0 : undefined

  return {
    q: q.get('q') ?? undefined,
    categoryId: q.get('categoryId') ?? undefined,
    priceMin: num(q.get('priceMin') ?? undefined),
    priceMax: num(q.get('priceMax') ?? undefined),
    priceCurrency: q.get('priceCurrency') ?? undefined,
    conditions,
    conditionIds: csv(q.get('conditionIds') ?? undefined),
    buyingOptions,
    sellers: csv(q.get('sellers') ?? undefined),
    excludeSellers: csv(q.get('excludeSellers') ?? undefined),
    itemLocationCountry: q.get('itemLocationCountry') ?? undefined,
    maxDeliveryCost,
    returnsAccepted: bool(q.get('returnsAccepted') ?? undefined),
    searchInDescription: bool(q.get('searchInDescription') ?? undefined),
    aspects: parseAspects(q.get('aspects') ?? undefined),
    sort,
    limit: num(q.get('limit') ?? undefined),
    offset: num(q.get('offset') ?? undefined),
  }
}

const ebayRoutes = new Hono<AuthEnv>()

ebayRoutes.use(requireAuth)

ebayRoutes.get('/search', async (c) => {
  const url = new URL(c.req.url)
  const filters = parseFilters(url.searchParams)
  try {
    const result = await searchItems(filters)
    return c.json(result)
  } catch (err) {
    if (err instanceof EbayApiError) {
      return c.json({ error: err.message, status: err.status, body: err.body }, 502)
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

ebayRoutes.get('/aspects', async (c) => {
  const categoryId = c.req.query('categoryId')
  if (!categoryId) return c.json({ error: 'categoryId is required' }, 400)
  const q = c.req.query('q')
  try {
    const dists = await getAspectDistributions(categoryId, q)
    return c.json({ categoryId, aspectDistributions: dists })
  } catch (err) {
    if (err instanceof EbayApiError) {
      return c.json({ error: err.message, status: err.status, body: err.body }, 502)
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

ebayRoutes.get('/quota', async (c) => {
  const stats = getCallStats()
  const activeWatches = await WatchModel.countDocuments({
    status: { $in: ['active', 'rate_limited'] },
  })
  return c.json({ ...stats, activeWatches })
})

export default ebayRoutes
