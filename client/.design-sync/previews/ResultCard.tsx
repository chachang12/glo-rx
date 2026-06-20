import { ResultCard } from 'glo-practice-tester'
import type { CompactItem } from '@/features/collect/ebay/types/ebay.schema'
import { Surface } from './_frame'

// ResultCard is an eBay search-result row: thumbnail, title, price, condition,
// seller, location, and a relative "listed" time.
//
// NOTE: passing `purchaseContext` makes ResultCard render an ItemMenu, which
// calls a react-query mutation hook (useQueryClient). The shipped DS bundle
// inlines its own react-query copy and does NOT re-export QueryClientProvider,
// so a preview-side provider can't share context identity — that path throws
// "No QueryClient set". These stories therefore exercise the (common) no-menu
// path, which is the component's full visual surface. The Purchased badge and
// dimmed/teal "already purchased" styling are driven by `alreadyPurchased`
// alone and render without the menu. See learnings/batch-C.md.

// A typical "buy it now" fixed-price listing with free shipping.
const seikoDiver: CompactItem = {
  itemId: 'v1|285912340011|0',
  legacyItemId: '285912340011',
  title: 'Seiko SKX007 Automatic Dive Watch 200m Black Dial Stainless Steel',
  affiliateUrl: 'https://www.ebay.com/itm/285912340011',
  webUrl: 'https://www.ebay.com/itm/285912340011',
  price: { value: '329.99', currency: 'USD' },
  condition: 'Pre-owned',
  conditionId: '3000',
  imageUrl: 'https://i.ebayimg.com/images/g/skx/s-l500.jpg',
  thumbnails: [],
  seller: { username: 'watch_vault_co', feedbackPct: '99.6', feedbackScore: 4821 },
  itemLocation: { country: 'US', postalCode: '60614', city: 'Chicago' },
  buyingOptions: ['FIXED_PRICE', 'BEST_OFFER'],
  currentBidPrice: null,
  bidCount: null,
  shippingCost: { value: '0.00', currency: 'USD' },
  category: { id: '31387', name: 'Wristwatches' },
  itemOriginDate: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  itemEndDate: null,
  marketingPrice: null,
}

// A live auction with bids — uses currentBidPrice + bidCount.
const omegaAuction: CompactItem = {
  itemId: 'v1|374128990022|0',
  legacyItemId: '374128990022',
  title: 'Omega Speedmaster Professional Moonwatch 3570.50 Hesalite Box & Papers',
  affiliateUrl: 'https://www.ebay.com/itm/374128990022',
  webUrl: 'https://www.ebay.com/itm/374128990022',
  price: { value: '4200.00', currency: 'USD' },
  condition: 'Pre-owned',
  conditionId: '3000',
  imageUrl: 'https://i.ebayimg.com/images/g/speedy/s-l500.jpg',
  thumbnails: [],
  seller: { username: 'chrono_estate', feedbackPct: '100.0', feedbackScore: 932 },
  itemLocation: { country: 'US', postalCode: '10018', city: 'New York' },
  buyingOptions: ['AUCTION'],
  currentBidPrice: { value: '3650.00', currency: 'USD' },
  bidCount: 14,
  shippingCost: { value: '24.99', currency: 'USD' },
  category: { id: '31387', name: 'Wristwatches' },
  itemOriginDate: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  itemEndDate: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
  marketingPrice: null,
}

// A no-image listing missing an affiliate link (shows the "no affiliate" flag).
const casioNoImage: CompactItem = {
  itemId: 'v1|195503210077|0',
  legacyItemId: '195503210077',
  title: 'Casio G-Shock GA-2100-1A1 "CasiOak" Carbon Core Black — New in Box',
  affiliateUrl: null,
  webUrl: 'https://www.ebay.com/itm/195503210077',
  price: { value: '89.95', currency: 'USD' },
  condition: 'New with tags',
  conditionId: '1000',
  imageUrl: null,
  thumbnails: [],
  seller: { username: 'g_shock_deals', feedbackPct: '98.2', feedbackScore: 15407 },
  itemLocation: { country: 'US', postalCode: '90012', city: 'Los Angeles' },
  buyingOptions: ['FIXED_PRICE'],
  currentBidPrice: null,
  bidCount: null,
  shippingCost: { value: '5.99', currency: 'USD' },
  category: { id: '31387', name: 'Wristwatches' },
  itemOriginDate: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  itemEndDate: null,
  marketingPrice: null,
}

export const FixedPriceListing = () => (
  <Surface style={{ maxWidth: 640 }}>
    <ResultCard item={seikoDiver} />
  </Surface>
)

export const HighlightedAuction = () => (
  <Surface style={{ maxWidth: 640 }}>
    <ResultCard item={omegaAuction} highlight />
  </Surface>
)

export const MissingImageNoAffiliate = () => (
  <Surface style={{ maxWidth: 640 }}>
    <ResultCard item={casioNoImage} />
  </Surface>
)

// Already-purchased state: dimmed card with the teal "Purchased" badge. Driven
// by `alreadyPurchased` alone (no purchaseContext → no react-query menu).
export const AlreadyPurchased = () => (
  <Surface style={{ maxWidth: 640 }}>
    <ResultCard item={seikoDiver} alreadyPurchased />
  </Surface>
)
