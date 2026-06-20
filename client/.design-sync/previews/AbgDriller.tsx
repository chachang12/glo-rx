import {
  AbgDriller,
  QueryClient,
  QueryClientProvider,
} from 'glo-practice-tester'
import { Surface } from './_frame'

// AbgDriller is a self-contained arterial-blood-gas drill (no props). It owns
// its own phase state machine and opens on the "setup" screen: the title, the
// session-length picker (5 / 10 / 20 / 30), and the Start button. Clicking Start
// transitions to "loading" and fires useGenerateAbgVignette (a react-query
// mutation) to fetch the clinical scenario — so the component must be wrapped in
// a QueryClientProvider even on the setup screen, where the hook is created but
// idle. The actual question screen (ABG table + answer choices) requires that
// async start flow, so the setup screen is the honest static state. The
// component renders its own full-bleed dark canvas (min-h-screen, bg-[#0f0f1a]),
// so it intentionally overrides the Surface background.
const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

export const Setup = () => (
  <QueryClientProvider client={makeClient()}>
    <Surface style={{ maxWidth: 760, padding: 0 }}>
      <AbgDriller />
    </Surface>
  </QueryClientProvider>
)
