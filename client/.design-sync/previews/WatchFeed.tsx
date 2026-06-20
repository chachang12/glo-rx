import { WatchFeed, QueryClient, QueryClientProvider } from 'glo-practice-tester'
import { Surface } from './_frame'

// WatchFeed live-streams a single saved watch's new eBay listings. The stream
// itself is driven by useWatchStream, which opens a browser EventSource against
// /api/collect/watches/:id/stream — there is no react-query cache to seed and
// no SSE backend in the harness, so the feed renders its honest, fully-styled
// live states: the status header (status dot + "Connecting…" → poll count +
// last-heartbeat clock) and the dashed empty box ("Watching for new listings…
// nothing yet this session.").
//
// It also reads useKnownPurchasedItems → ['collect','purchases','known-items'],
// which we seed so that hook resolves cleanly. Wrapped in a QueryClientProvider
// from the bundle (react-query is inlined in the DS lib).

const makeClient = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['collect', 'purchases', 'known-items'], {
    since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    itemIds: ['v1|285912340011|0', 'v1|374128990022|0'],
  })
  return qc
}

// Connected to a watch — shows the live status header + "watching" empty state.
export const Streaming = () => (
  <QueryClientProvider client={makeClient()}>
    <Surface style={{ maxWidth: 640 }}>
      <WatchFeed watchId="w_seiko_divers" watchName="Seiko Divers under $300" />
    </Surface>
  </QueryClientProvider>
)

// No watch selected — the dashed "No active stream." placeholder.
export const NoStream = () => (
  <QueryClientProvider client={makeClient()}>
    <Surface style={{ maxWidth: 640 }}>
      <WatchFeed watchId={null} />
    </Surface>
  </QueryClientProvider>
)
