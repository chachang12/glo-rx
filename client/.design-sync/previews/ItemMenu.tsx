import { ItemMenu, QueryClient, QueryClientProvider } from 'glo-practice-tester'
import type { CompactItem } from '@/features/collect/ebay/types/ebay.schema'
import { Surface } from './_frame'

// ItemMenu is the small round action button on a purchase-context result row.
// Closed it shows a 3-dot icon; once an item is marked it shows a filled teal
// check. Clicking opens a "Mark as purchased" popover (interaction-only).
//
// ItemMenu calls useCreatePurchase() → useQueryClient() unconditionally, so it
// needs a QueryClient in context. react-query is bundled INLINE in the DS lib,
// so we import QueryClient/QueryClientProvider from 'glo-practice-tester' (the
// bundle's own context) rather than @tanstack/react-query.

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const item: CompactItem = {
  itemId: 'v1|285912340011|0',
  legacyItemId: '285912340011',
  title: 'Seiko SKX007 Automatic Dive Watch 200m Black Dial Stainless Steel',
  affiliateUrl: 'https://www.ebay.com/itm/285912340011',
  webUrl: 'https://www.ebay.com/itm/285912340011',
  price: { value: '329.99', currency: 'USD' },
  condition: 'Pre-owned',
  conditionId: '3000',
  imageUrl: null,
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

const pad = { padding: 12 }

// Default closed state: 3-dot actions button.
export const Default = () => (
  <QueryClientProvider client={qc}>
    <Surface style={{ maxWidth: 320 }}>
      <div style={pad}>
        <ItemMenu item={item} watchId="w_seiko_divers" watchName="Seiko Divers" />
      </div>
    </Surface>
  </QueryClientProvider>
)

// Already-purchased state: filled teal check button instead of the dots.
export const AlreadyPurchased = () => (
  <QueryClientProvider client={qc}>
    <Surface style={{ maxWidth: 320 }}>
      <div style={pad}>
        <ItemMenu
          item={item}
          watchId="w_seiko_divers"
          watchName="Seiko Divers"
          alreadyPurchased
        />
      </div>
    </Surface>
  </QueryClientProvider>
)
