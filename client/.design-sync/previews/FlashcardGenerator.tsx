import {
  FlashcardGenerator,
  QueryClient,
  QueryClientProvider,
} from 'glo-practice-tester'
import { Surface } from './_frame'

// FlashcardGenerator takes a single {examCode} prop and calls
// useGenerateFlashcards (a react-query mutation) at the top of render, so it
// needs a QueryClientProvider even though nothing fires until "Generate" is
// clicked. It opens on the idle "Paste text" form (format + input-mode
// switchers, the notes textarea, and the disabled Generate button). The PDF
// dropzone is the alternate input mode reached by clicking "Upload PDF" — not
// statically reachable, so the default text view is the honest initial state.
const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

export const Idle = () => (
  <QueryClientProvider client={makeClient()}>
    <Surface style={{ maxWidth: 760 }}>
      <FlashcardGenerator examCode="NCLEX-RN" />
    </Surface>
  </QueryClientProvider>
)
