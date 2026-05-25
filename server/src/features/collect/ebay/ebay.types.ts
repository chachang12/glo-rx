export type EbayCondition = 'NEW' | 'USED' | 'UNSPECIFIED'
export type EbayBuyingOption = 'FIXED_PRICE' | 'AUCTION' | 'BEST_OFFER'
export type EbaySort = 'newlyListed' | 'endingSoonest' | 'price' | '-price'

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

export interface CompactItem {
  itemId: string
  legacyItemId: string
  title: string
  affiliateUrl: string | null
  webUrl: string
  price: { value: string; currency: string }
  condition: string | null
  conditionId: string | null
  imageUrl: string | null
  thumbnails: string[]
  seller: { username: string; feedbackPct: string; feedbackScore: number } | null
  itemLocation: { country: string; postalCode: string | null; city: string | null } | null
  buyingOptions: string[]
  currentBidPrice: { value: string; currency: string } | null
  bidCount: number | null
  shippingCost: { value: string; currency: string } | null
  category: { id: string; name: string } | null
  itemOriginDate: string | null
  itemEndDate: string | null
  marketingPrice: { originalPrice: string; discountPct: string } | null
}

export interface AspectValue {
  localizedAspectValue: string
  matchCount: number
}

export interface AspectDistribution {
  localizedAspectName: string
  aspectValueDistributions: AspectValue[]
}

export interface SearchResult {
  total: number
  limit: number
  offset: number
  items: CompactItem[]
  next: string | null
  prev: string | null
  aspectDistributions: AspectDistribution[] | null
  warnings: unknown[] | null
}

// Raw shape from eBay (only the fields we consume — projected into CompactItem)
export interface RawItemSummary {
  itemId: string
  legacyItemId?: string
  title?: string
  itemWebUrl?: string
  itemAffiliateWebUrl?: string
  price?: { value: string; currency: string }
  condition?: string
  conditionId?: string
  itemCreationDate?: string
  itemOriginDate?: string
  itemEndDate?: string
  image?: { imageUrl: string }
  thumbnailImages?: { imageUrl: string }[]
  additionalImages?: { imageUrl: string }[]
  seller?: { username: string; feedbackPercentage: string; feedbackScore: number }
  itemLocation?: { country: string; postalCode?: string; city?: string }
  buyingOptions?: string[]
  bidCount?: number
  currentBidPrice?: { value: string; currency: string }
  shippingOptions?: { shippingCost: { value: string; currency: string }; shippingCostType: string }[]
  categories?: { categoryId: string; categoryName: string }[]
  marketingPrice?: {
    originalPrice: { value: string; currency: string }
    discountAmount?: { value: string; currency: string }
    discountPercentage?: string
  }
}

export interface RawSearchResponse {
  href?: string
  total?: number
  limit?: number
  offset?: number
  next?: string
  prev?: string
  itemSummaries?: RawItemSummary[]
  refinement?: {
    aspectDistributions?: AspectDistribution[]
    categoryDistributions?: unknown[]
    conditionDistributions?: unknown[]
    buyingOptionDistributions?: unknown[]
  }
  warnings?: unknown[]
}
