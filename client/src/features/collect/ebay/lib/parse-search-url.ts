import type {
  EbayBuyingOption,
  EbaySort,
  SearchFilters,
} from '../types/ebay.schema'

/**
 * Parses an eBay UI search URL (the kind you get from ebay.com/sch/i.html?...)
 * into our SearchFilters shape. Best-effort — anything we can't map cleanly
 * gets dropped, with the parsed remainder still usable. Returns null if the
 * input can't be coerced into a URL at all.
 *
 * Excluded keywords (`_ex_kw`) are folded into `q` using Browse API's `-word`
 * exclusion syntax, since the Browse API has no separate "exclude" filter.
 */
export function parseEbaySearchUrl(input: string): SearchFilters | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    try {
      url = new URL(`https://www.ebay.com/sch/i.html?${trimmed.replace(/^\?/, '')}`)
    } catch {
      return null
    }
  }

  const p = url.searchParams
  const filters: SearchFilters = {}

  // Keywords + excluded keywords → q
  const nkw = p.get('_nkw')?.trim() ?? ''
  const exKw = p.get('_ex_kw')?.trim() ?? ''
  if (nkw || exKw) {
    const parts: string[] = []
    if (nkw) parts.push(nkw)
    if (exKw) {
      for (const word of exKw.split(/\s+/).filter(Boolean)) {
        parts.push(`-${word}`)
      }
    }
    const q = parts.join(' ')
    if (q) filters.q = q
  }

  // Category (0 means "All Categories" — drop it)
  const sacat = p.get('_sacat')?.trim()
  if (sacat && sacat !== '0') filters.categoryId = sacat

  // Price range
  const udlo = numberOrNull(p.get('_udlo'))
  const udhi = numberOrNull(p.get('_udhi'))
  if (udlo !== null) filters.priceMin = udlo
  if (udhi !== null) filters.priceMax = udhi
  if (udlo !== null || udhi !== null) filters.priceCurrency = 'USD'

  // Sort
  const sop = p.get('_sop')
  const sort = mapSop(sop)
  if (sort) filters.sort = sort

  // Condition (pipe-separated condition IDs)
  const cond = p.get('LH_ItemCondition')?.trim()
  if (cond) {
    const ids = cond.split('|').map((s) => s.trim()).filter(Boolean)
    if (ids.length > 0) filters.conditionIds = ids
  }

  // Buying options
  const buyingOptions: EbayBuyingOption[] = []
  if (p.get('LH_BIN') === '1') buyingOptions.push('FIXED_PRICE')
  if (p.get('LH_Auction') === '1') buyingOptions.push('AUCTION')
  if (p.get('LH_BO') === '1') buyingOptions.push('BEST_OFFER')
  if (buyingOptions.length > 0) filters.buyingOptions = buyingOptions

  // Free shipping
  if (p.get('LH_FS') === '1') filters.maxDeliveryCost = 0

  // Search descriptions
  if (p.get('LH_TitleDesc') === '1') filters.searchInDescription = true

  // Returns accepted
  if (p.get('LH_RPA') === '1') filters.returnsAccepted = true

  // No fields at all → treat as a parse failure so the caller can show an error
  return Object.keys(filters).length > 0 ? filters : null
}

function numberOrNull(s: string | null): number | null {
  if (s === null || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function mapSop(sop: string | null): EbaySort | undefined {
  switch (sop) {
    case '10': return 'newlyListed'
    case '1':  return 'endingSoonest'
    case '15': return 'price'
    case '16': return '-price'
    default:   return undefined
  }
}
