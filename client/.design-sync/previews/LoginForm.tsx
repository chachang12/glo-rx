import { LoginForm, MemoryRouter } from 'glo-practice-tester'
import { Surface } from './_frame'

// LoginForm calls useSearchParams (react-router), so it needs MemoryRouter.
// It renders the default sign-in state: the primary "Continue with Google"
// button plus the disabled GitHub / email providers. Loading and error UI are
// driven by internal state we can't set from here, so we show the default.
export const Default = () => (
  <MemoryRouter initialEntries={['/login']}>
    <Surface style={{ maxWidth: 420 }}>
      <LoginForm />
    </Surface>
  </MemoryRouter>
)
