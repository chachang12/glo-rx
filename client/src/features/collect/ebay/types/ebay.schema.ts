import { z } from 'zod'

export const PriceSchema = z.object({
  value: z.string(),
  currency: z.string(),
})

export const CompactItemSchema = z.object({
  itemId: z.string(),
  legacyItemId: z.string(),
  title: z.string(),
  affiliateUrl: z.string().nullable(),
  webUrl: z.string(),
  price: PriceSchema,
  condition: z.string().nullable(),
  conditionId: z.string().nullable(),
  imageUrl: z.string().nullable(),
  thumbnails: z.array(z.string()),
  seller: z
    .object({
      username: z.string(),
      feedbackPct: z.string(),
      feedbackScore: z.number(),
    })
    .nullable(),
  itemLocation: z
    .object({
      country: z.string(),
      postalCode: z.string().nullable(),
      city: z.string().nullable(),
    })
    .nullable(),
  buyingOptions: z.array(z.string()),
  currentBidPrice: PriceSchema.nullable(),
  bidCount: z.number().nullable(),
  shippingCost: PriceSchema.nullable(),
  category: z.object({ id: z.string(), name: z.string() }).nullable(),
  itemOriginDate: z.string().nullable(),
  itemEndDate: z.string().nullable(),
  marketingPrice: z
    .object({ originalPrice: z.string(), discountPct: z.string() })
    .nullable(),
})

export type CompactItem = z.infer<typeof CompactItemSchema>

export const AspectValueSchema = z.object({
  localizedAspectValue: z.string(),
  matchCount: z.number(),
})

export const AspectDistributionSchema = z.object({
  localizedAspectName: z.string(),
  aspectValueDistributions: z.array(AspectValueSchema),
})

export type AspectDistribution = z.infer<typeof AspectDistributionSchema>

export const SearchResultSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  items: z.array(CompactItemSchema),
  next: z.string().nullable(),
  prev: z.string().nullable(),
  aspectDistributions: z.array(AspectDistributionSchema).nullable(),
  warnings: z.array(z.unknown()).nullable(),
})

export type SearchResult = z.infer<typeof SearchResultSchema>

export const AspectsResponseSchema = z.object({
  categoryId: z.string(),
  aspectDistributions: z.array(AspectDistributionSchema),
})

export type AspectsResponse = z.infer<typeof AspectsResponseSchema>

export const QuotaResponseSchema = z.object({
  dailyCalls: z.number(),
  resetAt: z.number(),
  limit: z.number(),
  activeWatches: z.number(),
})

export type QuotaResponse = z.infer<typeof QuotaResponseSchema>

export const EbayConditionSchema = z.enum(['NEW', 'USED', 'UNSPECIFIED'])
export const EbayBuyingOptionSchema = z.enum(['FIXED_PRICE', 'AUCTION', 'BEST_OFFER'])
export const EbaySortSchema = z.enum(['newlyListed', 'endingSoonest', 'price', '-price'])

export type EbayCondition = z.infer<typeof EbayConditionSchema>
export type EbayBuyingOption = z.infer<typeof EbayBuyingOptionSchema>
export type EbaySort = z.infer<typeof EbaySortSchema>

export interface SearchFilters {
  q?: string
  categoryId?: string
  priceMin?: number
  priceMax?: number
  priceCurrency?: string
  conditions?: EbayCondition[]
  conditionIds?: string[]
  buyingOptions?: EbayBuyingOption[]
  sellers?: string[]
  excludeSellers?: string[]
  itemLocationCountry?: string
  maxDeliveryCost?: 0
  returnsAccepted?: boolean
  searchInDescription?: boolean
  aspects?: Record<string, string[]>
  sort?: EbaySort
  limit?: number
  offset?: number
}

/**
 * Serializes a SearchFilters object into the query-string convention used
 * by /api/collect/ebay/search and /watch. Keeps two callers (REST and
 * EventSource) on the same wire format.
 */
export function filtersToQuery(f: SearchFilters): URLSearchParams {
  const qp = new URLSearchParams()
  if (f.q) qp.set('q', f.q)
  if (f.categoryId) qp.set('categoryId', f.categoryId)
  if (f.priceMin !== undefined) qp.set('priceMin', String(f.priceMin))
  if (f.priceMax !== undefined) qp.set('priceMax', String(f.priceMax))
  if (f.priceCurrency) qp.set('priceCurrency', f.priceCurrency)
  if (f.conditions?.length) qp.set('conditions', f.conditions.join(','))
  if (f.conditionIds?.length) qp.set('conditionIds', f.conditionIds.join(','))
  if (f.buyingOptions?.length) qp.set('buyingOptions', f.buyingOptions.join(','))
  if (f.sellers?.length) qp.set('sellers', f.sellers.join(','))
  if (f.excludeSellers?.length) qp.set('excludeSellers', f.excludeSellers.join(','))
  if (f.itemLocationCountry) qp.set('itemLocationCountry', f.itemLocationCountry)
  if (f.maxDeliveryCost === 0) qp.set('maxDeliveryCost', '0')
  if (f.returnsAccepted) qp.set('returnsAccepted', 'true')
  if (f.searchInDescription) qp.set('searchInDescription', 'true')
  if (f.aspects && Object.keys(f.aspects).length > 0) {
    qp.set('aspects', JSON.stringify(f.aspects))
  }
  if (f.sort) qp.set('sort', f.sort)
  if (f.limit !== undefined) qp.set('limit', String(f.limit))
  if (f.offset !== undefined) qp.set('offset', String(f.offset))
  return qp
}
