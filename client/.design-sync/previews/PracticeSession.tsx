import {
  PracticeSession,
  QueryClient,
  QueryClientProvider,
} from 'glo-practice-tester'
import type { SessionQuestion } from '@/features/learn/tests/types/session'
import { Surface } from './_frame'

// PracticeSession orchestrates a whole quiz run via the internal useQuizSession
// state machine, so it always opens on the FIRST question in the "active" phase
// (no static way to drive it to a revealed / complete state — that needs user
// taps). It also calls useTutorExplanation (a react-query mutation) at the top
// of render, so it MUST be wrapped in a QueryClientProvider even though the
// mutation only fires when the AI-tutor panel is opened. retry:false keeps the
// idle mutation from ever touching the network in the preview.
const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const noop = () => {}

// ── Instant-grading deck: MCQ first, timer visible ──────────────────────────
const instantQuestions: SessionQuestion[] = [
  {
    _id: 'ps-instant-1',
    type: 'mcq',
    stem: 'A client with acute decompensated heart failure develops pink, frothy sputum and crackles to the apices. Which intervention should the nurse perform first?',
    options: {
      a: 'Obtain a 12-lead ECG',
      b: 'Place the client in high-Fowler position',
      c: 'Administer furosemide 40 mg IV push',
      d: 'Draw a brain natriuretic peptide (BNP) level',
    },
    answer: ['b'],
    difficulty: 'medium',
    topics: ['Cardiovascular · Heart Failure'],
    explanation:
      'Positioning upright reduces venous return and improves oxygenation immediately, before pharmacologic or diagnostic measures.',
  },
  {
    _id: 'ps-instant-2',
    type: 'mcq',
    stem: 'A nurse reviews an ABG: pH 7.28, PaCO₂ 58 mmHg, HCO₃⁻ 24 mEq/L. How should the nurse interpret these results?',
    options: {
      a: 'Uncompensated respiratory acidosis',
      b: 'Partially compensated metabolic acidosis',
      c: 'Fully compensated respiratory alkalosis',
      d: 'Uncompensated metabolic alkalosis',
    },
    answer: ['a'],
    difficulty: 'hard',
    topics: ['Acid–Base Balance'],
  },
]

// ── End-grading deck: SATA first, silent collection ─────────────────────────
const endQuestions: SessionQuestion[] = [
  {
    _id: 'ps-end-1',
    type: 'sata',
    stem: 'A client is started on warfarin for atrial fibrillation. Which findings should the nurse report to the provider? Select all that apply.',
    options: {
      a: 'INR of 5.8',
      b: 'Bleeding gums when brushing teeth',
      c: 'INR of 2.4',
      d: 'Bright red blood in the urine',
      e: 'Occasional mild headache relieved by rest',
    },
    answer: ['a', 'b', 'd'],
    difficulty: 'medium',
    topics: ['Pharmacology · Anticoagulants'],
    explanation:
      'A supratherapeutic INR and any frank bleeding signal warfarin toxicity and must be reported.',
  },
  {
    _id: 'ps-end-2',
    type: 'mcq',
    stem: 'Which lab value most warrants holding the next scheduled dose of digoxin?',
    options: {
      a: 'Potassium 3.1 mEq/L',
      b: 'Sodium 138 mEq/L',
      c: 'Creatinine 0.9 mg/dL',
      d: 'Hemoglobin 13.2 g/dL',
    },
    answer: ['a'],
    difficulty: 'medium',
    topics: ['Pharmacology · Cardiac Glycosides'],
  },
]

export const InstantGrading = () => (
  <QueryClientProvider client={makeClient()}>
    <Surface style={{ maxWidth: 760, padding: 0 }}>
      <PracticeSession
        questions={instantQuestions}
        title="Cardiac & Acid–Base Review"
        gradingMode="instant"
        examCode="NCLEX-RN"
        onComplete={noop}
        onRestart={noop}
        onExit={noop}
      />
    </Surface>
  </QueryClientProvider>
)

export const EndModeSATA = () => (
  <QueryClientProvider client={makeClient()}>
    <Surface style={{ maxWidth: 760, padding: 0 }}>
      <PracticeSession
        questions={endQuestions}
        title="Pharmacology Block"
        gradingMode="end"
        examCode="NCLEX-RN"
        onComplete={noop}
        onRestart={noop}
        onExit={noop}
      />
    </Surface>
  </QueryClientProvider>
)
