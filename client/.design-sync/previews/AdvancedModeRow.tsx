import { AdvancedModeRow, QueryClient, QueryClientProvider } from 'glo-practice-tester'
import type { AppUser } from '@/features/shared/user'
import { Surface } from './_frame'

// AdvancedModeRow is a settings-list row that unlocks faster eBay polling +
// more concurrent watches via an access key. It reads useGetMe →
// userKeys.me() = ['user','me'] and flips between an "Activate" CTA (off) and an
// amber "Active" badge with the unlocked-limits subtitle (on). It also calls
// useRedeemAdvancedKey (a mutation needing a QueryClient), so we wrap in a
// QueryClientProvider from the bundle and seed `me` for both states.
//
// The component renders bare `.row-item` markup whose styles are scoped under
// `.axeous-collect-profile .row-*` in the bundled CSS. We reproduce the real
// profile page's `<div className="axeous-collect-profile"><div className="card
// section-card">` wrapper so the row gets its card chrome, icon tile, and pill.

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
}

const makeClient = (advancedCollectMode: boolean) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['user', 'me'], { ...baseUser, advancedCollectMode })
  return qc
}

// Locked — neutral bolt icon, value-prop subtitle, "Activate" button.
export const Locked = () => (
  <QueryClientProvider client={makeClient(false)}>
    <Surface style={{ maxWidth: 640 }}>
      <Row>
        <AdvancedModeRow />
      </Row>
    </Surface>
  </QueryClientProvider>
)

// Active — amber bolt icon, limits subtitle, amber "Active" badge.
export const Active = () => (
  <QueryClientProvider client={makeClient(true)}>
    <Surface style={{ maxWidth: 640 }}>
      <Row>
        <AdvancedModeRow />
      </Row>
    </Surface>
  </QueryClientProvider>
)
