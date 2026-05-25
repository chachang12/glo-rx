import type { SearchFilters } from './ebay.types.js'

export interface BuildOptions {
  sinceISO?: string
  fieldgroups?: string[]
}

// Items joined by | inside {...} — used for sets like conditions:{NEW|USED}
const joinSet = (values: readonly string[]) => `{${values.join('|')}}`

function buildFilterString(f: SearchFilters, sinceISO?: string): string {
  const parts: string[] = []

  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    const min = f.priceMin !== undefined ? String(f.priceMin) : ''
    const max = f.priceMax !== undefined ? String(f.priceMax) : ''
    if (min && max) parts.push(`price:[${min}..${max}]`)
    else if (min) parts.push(`price:[${min}]`)
    else if (max) parts.push(`price:[..${max}]`)
    parts.push(`priceCurrency:${f.priceCurrency ?? 'USD'}`)
  }

  if (f.conditions?.length) parts.push(`conditions:${joinSet(f.conditions)}`)
  if (f.conditionIds?.length) parts.push(`conditionIds:${joinSet(f.conditionIds)}`)
  if (f.buyingOptions?.length) parts.push(`buyingOptions:${joinSet(f.buyingOptions)}`)
  if (f.sellers?.length) parts.push(`sellers:${joinSet(f.sellers)}`)
  if (f.excludeSellers?.length) parts.push(`excludeSellers:${joinSet(f.excludeSellers)}`)
  if (f.itemLocationCountry) parts.push(`itemLocationCountry:${f.itemLocationCountry}`)
  if (f.maxDeliveryCost === 0) parts.push('maxDeliveryCost:0')
  if (f.returnsAccepted) parts.push('returnsAccepted:true')
  if (f.searchInDescription) parts.push('searchInDescription:true')
  if (sinceISO) parts.push(`itemStartDate:[${sinceISO}..]`)

  return parts.join(',')
}

// eBay's aspect_filter has the form: categoryId:<id>,<Aspect>:{val1|val2},...
// The categoryId MUST match the `category_ids` query param exactly.
function buildAspectFilter(categoryId: string | undefined, aspects?: Record<string, string[]>): string | null {
  if (!categoryId || !aspects) return null
  const entries = Object.entries(aspects).filter(([, v]) => v.length > 0)
  if (entries.length === 0) return null
  const parts = [`categoryId:${categoryId}`]
  for (const [name, values] of entries) parts.push(`${name}:${joinSet(values)}`)
  return parts.join(',')
}

export function buildQueryParams(f: SearchFilters, opts: BuildOptions = {}): URLSearchParams {
  const params = new URLSearchParams()

  if (f.q) params.set('q', f.q)
  if (f.categoryId) params.set('category_ids', f.categoryId)
  if (f.sort) params.set('sort', f.sort)
  if (f.limit !== undefined) params.set('limit', String(f.limit))
  if (f.offset !== undefined) params.set('offset', String(f.offset))

  const filterStr = buildFilterString(f, opts.sinceISO)
  if (filterStr) params.set('filter', filterStr)

  const aspectFilter = buildAspectFilter(f.categoryId, f.aspects)
  if (aspectFilter) params.set('aspect_filter', aspectFilter)

  if (opts.fieldgroups?.length) params.set('fieldgroups', opts.fieldgroups.join(','))

  return params
}

// Stable key for caching — does not include the dynamic sinceISO so the
// caller can choose whether to bypass the cache for delta polls.
export function cacheKey(f: SearchFilters): string {
  return JSON.stringify({
    q: f.q ?? null,
    c: f.categoryId ?? null,
    p: [f.priceMin ?? null, f.priceMax ?? null, f.priceCurrency ?? null],
    cs: f.conditions ?? null,
    ci: f.conditionIds ?? null,
    b: f.buyingOptions ?? null,
    s: f.sellers ?? null,
    xs: f.excludeSellers ?? null,
    loc: f.itemLocationCountry ?? null,
    mdc: f.maxDeliveryCost ?? null,
    ra: f.returnsAccepted ?? null,
    sid: f.searchInDescription ?? null,
    a: f.aspects ?? null,
    so: f.sort ?? null,
    l: f.limit ?? null,
    o: f.offset ?? null,
  })
}
