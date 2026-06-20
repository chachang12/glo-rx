import {
  MultiView,
  MemoryRouter,
  QueryClient,
  QueryClientProvider,
} from 'glo-practice-tester'
import type { Watch } from '@/features/collect/watches'
import { Surface } from './_frame'

// MultiView is the Collect dashboard's 2x2 quadrant grid. Each empty quadrant
// shows a "+ Select watch" button (because saved watches exist) or, if there
// are none, a "Create one" CTA. Selecting a watch live-streams it via
// EventSource — not available in the harness — so these stories show the
// honest pre-selection state with real saved-watch data seeded.
//
// useGetWatches → watchKeys.list() = ['collect','watches','list']
// Needs MemoryRouter (quadrants render <Link>s) + QueryClientProvider.

const now = Date.now()
const iso = (msAgo: number) => new Date(now - msAgo).toISOString()

const watches: Watch[] = [
  {
    id: 'w_seiko_divers',
    authId: 'auth_demo',
    name: 'Seiko Divers under $300',
    filters: { q: 'seiko diver', categoryId: '31387', priceMax: 300 },
    notifyMode: 'both',
    status: 'active',
    startedAt: iso(1000 * 60 * 60 * 26),
    lastPolledAt: iso(1000 * 22),
    nextPollAt: iso(-1000 * 8),
    matchCount: 47,
    pollCount: 612,
    lastError: null,
    createdAt: iso(1000 * 60 * 60 * 26),
    updatedAt: iso(1000 * 22),
  },
  {
    id: 'w_omega_speedy',
    authId: 'auth_demo',
    name: 'Omega Speedmaster Box & Papers',
    filters: { q: 'omega speedmaster professional', categoryId: '31387', priceMin: 2500 },
    notifyMode: 'telegram_only',
    status: 'rate_limited',
    startedAt: iso(1000 * 60 * 60 * 52),
    lastPolledAt: iso(1000 * 60 * 4),
    nextPollAt: iso(-1000 * 60 * 6),
    matchCount: 9,
    pollCount: 288,
    lastError: null,
    createdAt: iso(1000 * 60 * 60 * 52),
    updatedAt: iso(1000 * 60 * 4),
  },
  {
    id: 'w_gshock_new',
    authId: 'auth_demo',
    name: 'G-Shock CasiOak NWT',
    filters: { q: 'g-shock ga-2100 casioak', categoryId: '31387', conditions: ['NEW'] },
    notifyMode: 'sse_only',
    status: 'paused',
    startedAt: iso(1000 * 60 * 60 * 9),
    lastPolledAt: iso(1000 * 60 * 60 * 3),
    nextPollAt: null,
    matchCount: 0,
    pollCount: 74,
    lastError: null,
    createdAt: iso(1000 * 60 * 60 * 9),
    updatedAt: iso(1000 * 60 * 60 * 3),
  },
]

const makeClient = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['collect', 'watches', 'list'], watches)
  return qc
}

export const QuadrantGrid = () => (
  <QueryClientProvider client={makeClient()}>
    <MemoryRouter initialEntries={['/app/collect']}>
      <Surface style={{ maxWidth: 720 }}>
        <MultiView />
      </Surface>
    </MemoryRouter>
  </QueryClientProvider>
)
