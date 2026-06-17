import type { EbayBuyingOption, EbayCondition, EbaySort } from './ebay.types.js'

// Allowed values for the eBay Browse API filter params. Shared by the search
// (ebay) and watch routes so the two can't accept divergent sets.
export const CONDITIONS: readonly EbayCondition[] = ['NEW', 'USED', 'UNSPECIFIED']
export const BUYING_OPTIONS: readonly EbayBuyingOption[] = [
  'FIXED_PRICE',
  'AUCTION',
  'BEST_OFFER',
]
export const SORTS: readonly EbaySort[] = [
  'newlyListed',
  'endingSoonest',
  'price',
  '-price',
]
