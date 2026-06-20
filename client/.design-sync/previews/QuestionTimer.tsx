import { QuestionTimer } from 'glo-practice-tester'
import { Surface } from './_frame'

// Thin per-question countdown bar; turns coral in the final 15 seconds.
export const PlentyOfTime = () => (
  <Surface style={{ maxWidth: 560 }}>
    <QuestionTimer timeLeft={45} totalSeconds={60} />
  </Surface>
)

export const Halfway = () => (
  <Surface style={{ maxWidth: 560 }}>
    <QuestionTimer timeLeft={30} totalSeconds={60} />
  </Surface>
)

export const LowWarning = () => (
  <Surface style={{ maxWidth: 560 }}>
    <QuestionTimer timeLeft={8} totalSeconds={60} />
  </Surface>
)
