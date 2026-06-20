import { TelegramRow, QueryClient, QueryClientProvider } from 'glo-practice-tester'
import type { AppUser } from '@/features/shared/user'
import { Surface } from './_frame'

// TelegramRow is a settings-list row that connects/disconnects Telegram alerts.
// It reads the current user via useGetMe → userKeys.me() = ['user','me'] and
// flips between a "Connect" CTA (unlinked) and a "Disconnect" action with the
// connected @username (linked). We seed `me` to show both real states.
//
// The component renders bare `.row-item` markup whose styles are scoped under
// `.axeous-collect-profile .row-*` in the bundled CSS (matching the real
// profile page). We reproduce that page's `<div className="axeous-collect-profile">
// <div className="card section-card">` wrapper so the row gets its real card
// chrome, icon tile, and pill button.

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="axeous-collect-profile">
    <div className="card section-card">{children}</div>
  </div>
)

const baseUser: AppUser = {
  _id: 'u_demo',
  authId: 'auth_demo',
  username: 'watchhunter',
  firstName: 'Dana',
  lastName: 'Reyes',
  displayName: 'Dana Reyes',
  activeExam: null,
  exams: [],
  role: 'user',
  onboardingComplete: true,
  advancedCollectMode: false,
  examAccess: [],
  telegramChatId: null,
  telegramUsername: null,
}

const makeClient = (overrides: Partial<AppUser>) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['user', 'me'], { ...baseUser, ...overrides })
  return qc
}

// Not yet connected — shows the "Connect" CTA and the value-prop subtitle.
export const Unlinked = () => (
  <QueryClientProvider client={makeClient({ telegramChatId: null, telegramUsername: null })}>
    <Surface style={{ maxWidth: 640 }}>
      <Row>
        <TelegramRow />
      </Row>
    </Surface>
  </QueryClientProvider>
)

// Linked — teal Telegram icon, "Connected as @username", and a Disconnect action.
export const Linked = () => (
  <QueryClientProvider
    client={makeClient({
      telegramChatId: '628194013',
      telegramUsername: 'dana_reyes',
      telegramLinkedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    })}
  >
    <Surface style={{ maxWidth: 640 }}>
      <Row>
        <TelegramRow />
      </Row>
    </Surface>
  </QueryClientProvider>
)
