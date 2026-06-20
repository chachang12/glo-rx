import { AiTutorPanel } from 'glo-practice-tester'
import type { TutorExplanation } from '@/features/learn/tests/api/get-tutor'
import { Surface } from './_frame'

const noop = () => {}

// AiTutorPanel is a fixed bottom-sheet (position: fixed). In a preview card it
// anchors to the card viewport bottom. A tall Surface gives the sheet room and
// shows the dark backdrop overlay behind it. open=true for all stories.

const loadedData: TutorExplanation = {
  whyWrong:
    'Spironolactone is a potassium-sparing diuretic that works through aldosterone antagonism in the distal tubule. Its onset is too slow to relieve acute pulmonary edema, where rapid preload reduction is the goal.',
  keyConcept:
    'For acute decompensated heart failure with pulmonary edema, a loop diuretic such as IV furosemide is first-line because it produces rapid, high-volume diuresis by blocking the Na-K-2Cl cotransporter in the thick ascending limb.',
  memoryTip:
    'Loops are for "loops of fluid" you need gone fast — furosemide = "fast pee." Save spironolactone for chronic potassium-sparing control, not the crashing patient.',
}

export const Loaded = () => (
  <Surface style={{ maxWidth: 600, minHeight: 560, position: 'relative' }}>
    <AiTutorPanel open loading={false} error={false} data={loadedData} onClose={noop} onRetry={noop} />
  </Surface>
)

export const Loading = () => (
  <Surface style={{ maxWidth: 600, minHeight: 560, position: 'relative' }}>
    <AiTutorPanel open loading error={false} data={null} onClose={noop} onRetry={noop} />
  </Surface>
)

export const Error = () => (
  <Surface style={{ maxWidth: 600, minHeight: 560, position: 'relative' }}>
    <AiTutorPanel open loading={false} error data={null} onClose={noop} onRetry={noop} />
  </Surface>
)
