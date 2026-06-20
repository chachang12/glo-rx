import {
  CollectNavbar,
  MemoryRouter,
  QueryClient,
  QueryClientProvider,
} from 'glo-practice-tester'
import { Surface } from './_frame'

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

// CollectNavbar reads useLocation (router) and useGetMe (react-query), so it
// needs both providers. It renders the Collect product pill nav (Dashboard /
// Search / Watches). Start on /app/collect/search so the active indicator
// highlights a real tab.
export const Default = () => (
  <QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/app/collect/search']}>
      <Surface style={{ maxWidth: 900, padding: '40px 12px' }}>
        <CollectNavbar />
      </Surface>
    </MemoryRouter>
  </QueryClientProvider>
)
