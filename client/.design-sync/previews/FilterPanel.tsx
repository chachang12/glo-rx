import { FilterPanel } from 'glo-practice-tester'
import type { SearchFilters } from '@/features/collect/ebay/types/ebay.schema'
import { Surface } from './_frame'

// FilterPanel is the eBay search-filter form: keywords, category, price range,
// sort, location, plus condition / buying-option pill toggles and three
// checkboxes.
//
// NOTE: setting `initial.categoryId` makes FilterPanel render an AspectSelect
// sub-panel, which fetches category facets via a react-query hook. The DS
// bundle inlines its own react-query and doesn't re-export QueryClientProvider,
// so that path throws "No QueryClient set" in the preview harness (no shared
// context identity). These stories leave categoryId empty so the full form
// renders; the aspects sub-panel is documented in learnings/batch-C.md.

const noop = (_filters: SearchFilters) => {}

// A filled-out search for a vintage watch under a price ceiling.
const filledFilters: SearchFilters = {
  q: 'vintage seiko 6309 diver',
  priceMin: 100,
  priceMax: 600,
  priceCurrency: 'USD',
  conditions: ['USED'],
  buyingOptions: ['FIXED_PRICE', 'BEST_OFFER'],
  sort: 'newlyListed',
  itemLocationCountry: 'US',
  maxDeliveryCost: 0,
  returnsAccepted: true,
}

// An auction-focused filter, ending soonest.
const auctionFilters: SearchFilters = {
  q: 'omega speedmaster 3570.50',
  priceMin: 2000,
  conditions: ['USED'],
  buyingOptions: ['AUCTION'],
  sort: 'endingSoonest',
  searchInDescription: true,
}

// A brand-new fixed-price search, lowest price first, free shipping only.
const newOnlyFilters: SearchFilters = {
  q: 'g-shock ga-2100 casioak',
  priceMax: 120,
  priceCurrency: 'USD',
  conditions: ['NEW'],
  buyingOptions: ['FIXED_PRICE'],
  sort: 'price',
  maxDeliveryCost: 0,
  itemLocationCountry: 'US',
}

export const FilledWatchSearch = () => (
  <Surface style={{ maxWidth: 640 }}>
    <FilterPanel initial={filledFilters} submitLabel="Search listings" onSubmit={noop} />
  </Surface>
)

export const AuctionSearch = () => (
  <Surface style={{ maxWidth: 640 }}>
    <FilterPanel initial={auctionFilters} submitLabel="Find auctions" onSubmit={noop} />
  </Surface>
)

export const EmptyDefaults = () => (
  <Surface style={{ maxWidth: 640 }}>
    <FilterPanel submitLabel="Search" onSubmit={noop} />
  </Surface>
)

export const NewOnlyFreeShipping = () => (
  <Surface style={{ maxWidth: 640 }}>
    <FilterPanel initial={newOnlyFilters} submitLabel="Create watch" onSubmit={noop} />
  </Surface>
)
