import {
  Navbar,
  MemoryRouter,
  QueryClient,
  QueryClientProvider,
} from 'glo-practice-tester'
import { Surface } from './_frame'

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

// Navbar reads useLocation (router) and data hooks (useGetMe /
// useGetIncomingFriendRequests via react-query), so it needs both providers.
// Signed-out is fine — it renders the public/marketing pill nav. Set the
// initial route to /app/plans so the sliding active-pill indicator lands on a
// real nav item (Plans).
export const Default = () => (
  <QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/app/plans']}>
      <Surface style={{ maxWidth: 900, padding: '40px 12px' }}>
        <Navbar />
      </Surface>
    </MemoryRouter>
  </QueryClientProvider>
)
