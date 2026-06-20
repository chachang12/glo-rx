import { FeedbackPanel } from 'glo-practice-tester'
import { Surface } from './_frame'

const noop = () => {}

export const Correct = () => (
  <Surface style={{ maxWidth: 600 }}>
    <FeedbackPanel
      isCorrect
      timedOut={false}
      title="Correct"
      explanation="Furosemide is a loop diuretic that blocks the Na-K-2Cl cotransporter in the thick ascending limb, producing rapid diuresis. It is first-line for acute pulmonary edema."
      showTutorButton={false}
      onOpenTutor={noop}
    />
  </Surface>
)

export const Incorrect = () => (
  <Surface style={{ maxWidth: 600 }}>
    <FeedbackPanel
      isCorrect={false}
      timedOut={false}
      title="Not quite"
      explanation="Spironolactone is a potassium-sparing diuretic that works too slowly to relieve acute decompensation."
      correctAnswerText="Furosemide 40 mg IV push"
      showTutorButton
      onOpenTutor={noop}
    />
  </Surface>
)

export const TimedOut = () => (
  <Surface style={{ maxWidth: 600 }}>
    <FeedbackPanel
      isCorrect={false}
      timedOut
      title="Time's up"
      explanation="The question timer expired before you submitted an answer."
      correctAnswerText="Furosemide 40 mg IV push"
      showTutorButton
      onOpenTutor={noop}
    />
  </Surface>
)
