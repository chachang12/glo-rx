import { SessionHud } from 'glo-practice-tester'
import { Surface } from './_frame'

const noop = () => {}

// accuracy is a 0–100 integer per the component source (null before grading).
export const MidSession = () => (
  <Surface style={{ maxWidth: 560 }}>
    <SessionHud
      index={4}
      total={20}
      topic="Acid–Base Balance"
      streak={3}
      accuracy={85}
      onExit={noop}
    />
  </Surface>
)

export const EarlyNoStreak = () => (
  <Surface style={{ maxWidth: 560 }}>
    <SessionHud
      index={0}
      total={20}
      topic="Pharmacology · Anticoagulants"
      streak={0}
      accuracy={null}
      onExit={noop}
    />
  </Surface>
)

export const NearComplete = () => (
  <Surface style={{ maxWidth: 560 }}>
    <SessionHud
      index={18}
      total={20}
      topic="Cardiovascular Disorders"
      streak={11}
      accuracy={92}
      onExit={noop}
    />
  </Surface>
)
