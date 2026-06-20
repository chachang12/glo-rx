import { SessionReview } from 'glo-practice-tester'
import type { SessionQuestion } from '@/features/learn/tests/types/session'
import { Surface } from './_frame'

const noop = () => {}

const questions: SessionQuestion[] = [
  {
    _id: 'q1',
    type: 'mcq',
    stem: 'A client with acute pulmonary edema is short of breath. Which medication should the nurse anticipate administering first?',
    options: {
      a: 'Furosemide 40 mg IV push',
      b: 'Spironolactone 25 mg PO',
      c: 'Metoprolol 5 mg IV',
      d: 'Normal saline 500 mL bolus',
    },
    answer: ['a'],
    explanation:
      'IV furosemide is first-line for acute pulmonary edema because it produces rapid diuresis, reducing preload and pulmonary congestion.',
    topics: ['Pharmacology'],
  },
  {
    _id: 'q2',
    type: 'sata',
    stem: 'Which findings would the nurse expect in a client with hypokalemia? Select all that apply.',
    options: {
      a: 'Flat or inverted T waves',
      b: 'Muscle weakness',
      c: 'Hyperactive deep tendon reflexes',
      d: 'Peaked T waves',
      e: 'Constipation',
    },
    answer: ['a', 'b', 'e'],
    explanation:
      'Hypokalemia causes flattened T waves, muscle weakness, and decreased GI motility. Peaked T waves and hyperreflexia are hyperkalemia findings.',
    topics: ['Fluid & Electrolytes'],
  },
  {
    _id: 'q3',
    type: 'ordered',
    stem: 'Place the steps for administering an IM injection in the correct order.',
    options: {
      a: 'Select and clean the injection site',
      b: 'Perform hand hygiene and don gloves',
      c: 'Insert the needle at a 90° angle',
      d: 'Aspirate, then inject the medication',
    },
    answer: ['b', 'a', 'c', 'd'],
    explanation: 'Hand hygiene precedes site prep, followed by needle insertion and injection.',
    topics: ['Skills'],
  },
]

const answers: Record<string, string[]> = {
  q1: ['a'],
  q2: ['a', 'b', 'd'],
  q3: ['b', 'a', 'c', 'd'],
}

const outcomes: Record<string, boolean> = {
  q1: true,
  q2: false,
  q3: true,
}

export const MixedReview = () => (
  <Surface style={{ maxWidth: 600 }}>
    <SessionReview
      questions={questions}
      answers={answers}
      outcomes={outcomes}
      correctCount={2}
      onDone={noop}
    />
  </Surface>
)

const fibQuestion: SessionQuestion[] = [
  {
    _id: 'f1',
    type: 'fib',
    stem: 'The nurse is preparing heparin. The order is for 5,000 units. The vial contains 10,000 units/mL. How many mL will the nurse administer? Record to the nearest tenth.',
    options: {},
    answer: ['0.5'],
    explanation: '5,000 units ÷ 10,000 units/mL = 0.5 mL.',
    topics: ['Dosage Calculation'],
  },
]

export const PerfectFillInBlank = () => (
  <Surface style={{ maxWidth: 600 }}>
    <SessionReview
      questions={fibQuestion}
      answers={{ f1: ['0.5'] }}
      outcomes={{ f1: true }}
      correctCount={1}
      onDone={noop}
    />
  </Surface>
)

export const LowScoreReview = () => (
  <Surface style={{ maxWidth: 600 }}>
    <SessionReview
      questions={questions}
      answers={{ q1: ['b'], q2: ['c', 'd'], q3: ['a', 'b', 'c', 'd'] }}
      outcomes={{ q1: false, q2: false, q3: false }}
      correctCount={0}
      onDone={noop}
    />
  </Surface>
)
