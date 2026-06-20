import { AspectSelect, QueryClient, QueryClientProvider } from 'glo-practice-tester'
import type { AspectsResponse } from '@/features/collect/ebay/types/ebay.schema'
import { Surface } from './_frame'

// AspectSelect fetches an eBay category's aspect facets via react-query
// (useGetEbayAspects) and renders them as toggleable value pills with match
// counts.
//
// react-query/react-router are bundled INLINE in the DS lib, so we import the
// provider from 'glo-practice-tester' (NOT @tanstack/react-query) — the bundled
// hook only sees a provider created from the bundle's own context. We seed the
// aspects query cache (key from useGetEbayAspects → ebayKeys.aspects) so the
// stories show real populated facet pills instead of the loading state.

const noop = (_next: Record<string, string[]>) => {}

const categoryId = '31387' // Wristwatches

// Realistic wristwatch aspect distribution (Brand / Movement / Case Material /
// Case Size), shaped to AspectsResponseSchema.
const aspects: AspectsResponse = {
  categoryId,
  aspectDistributions: [
    {
      localizedAspectName: 'Brand',
      aspectValueDistributions: [
        { localizedAspectValue: 'Seiko', matchCount: 1842 },
        { localizedAspectValue: 'Omega', matchCount: 1130 },
        { localizedAspectValue: 'Rolex', matchCount: 987 },
        { localizedAspectValue: 'Citizen', matchCount: 743 },
        { localizedAspectValue: 'Casio', matchCount: 612 },
        { localizedAspectValue: 'Tissot', matchCount: 388 },
        { localizedAspectValue: 'Hamilton', matchCount: 204 },
      ],
    },
    {
      localizedAspectName: 'Movement',
      aspectValueDistributions: [
        { localizedAspectValue: 'Automatic', matchCount: 2604 },
        { localizedAspectValue: 'Quartz (Battery)', matchCount: 1571 },
        { localizedAspectValue: 'Manual Winding', matchCount: 419 },
        { localizedAspectValue: 'Solar', matchCount: 233 },
      ],
    },
    {
      localizedAspectName: 'Case Material',
      aspectValueDistributions: [
        { localizedAspectValue: 'Stainless Steel', matchCount: 3120 },
        { localizedAspectValue: 'Titanium', matchCount: 287 },
        { localizedAspectValue: 'Gold Plated', matchCount: 196 },
        { localizedAspectValue: 'Ceramic', matchCount: 88 },
      ],
    },
    {
      localizedAspectName: 'Case Size',
      aspectValueDistributions: [
        { localizedAspectValue: '40 mm', matchCount: 901 },
        { localizedAspectValue: '42 mm', matchCount: 778 },
        { localizedAspectValue: '38 mm', matchCount: 540 },
        { localizedAspectValue: '44 mm', matchCount: 412 },
      ],
    },
  ],
}

const makeSeededClient = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // ebayKeys.aspects(categoryId, q) = ['collect','ebay','aspects', categoryId, q ?? '']
  qc.setQueryData(['collect', 'ebay', 'aspects', categoryId, 'seiko diver'], aspects)
  qc.setQueryData(['collect', 'ebay', 'aspects', categoryId, 'automatic dive watch'], aspects)
  return qc
}

export const Wristwatches = () => (
  <QueryClientProvider client={makeSeededClient()}>
    <Surface style={{ maxWidth: 640 }}>
      <AspectSelect categoryId={categoryId} q="seiko diver" value={{}} onChange={noop} />
    </Surface>
  </QueryClientProvider>
)

export const PreSelectedBrand = () => (
  <QueryClientProvider client={makeSeededClient()}>
    <Surface style={{ maxWidth: 640 }}>
      <AspectSelect
        categoryId={categoryId}
        q="automatic dive watch"
        value={{ Brand: ['Seiko', 'Omega'], Movement: ['Automatic'] }}
        onChange={noop}
      />
    </Surface>
  </QueryClientProvider>
)
