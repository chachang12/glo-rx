import { SessionComplete } from 'glo-practice-tester'
import type { SessionResults, SessionAnswer, TopicBreakdown } from '@/features/learn/tests/types/session'
import { Surface } from './_frame'

const noop = () => {}

function makeAnswers(total: number, correct: number, avgMs: number): SessionAnswer[] {
  return Array.from({ length: total }, (_, i) => ({
    questionId: `q${i + 1}`,
    selected: ['a'],
    correct: i < correct,
    timeMs: avgMs,
  }))
}

const strongResults: SessionResults = {
  totalQuestions: 20,
  correctCount: 17,
  durationMs: 12 * 60 * 1000,
  answers: makeAnswers(20, 17, 36_000),
}

const strongTopics: TopicBreakdown = {
  strong: ['Pharmacology', 'Fluid & Electrolytes'],
  weak: ['Acid–Base Balance'],
}

export const StrongSession = () => (
  <Surface style={{ maxWidth: 520 }}>
    <SessionComplete
      results={strongResults}
      bestStreak={9}
      topics={strongTopics}
      onRestart={noop}
      onExit={noop}
    />
  </Surface>
)

const lowResults: SessionResults = {
  totalQuestions: 15,
  correctCount: 7,
  durationMs: 9 * 60 * 1000,
  answers: makeAnswers(15, 7, 41_000),
}

const lowTopics: TopicBreakdown = {
  strong: ['Infection Control'],
  weak: ['Cardiac Dysrhythmias', 'Endocrine', 'Renal'],
}

export const LowScoreSession = () => (
  <Surface style={{ maxWidth: 520 }}>
    <SessionComplete
      results={lowResults}
      bestStreak={3}
      topics={lowTopics}
      onRestart={noop}
      onExit={noop}
    />
  </Surface>
)

const perfectResults: SessionResults = {
  totalQuestions: 10,
  correctCount: 10,
  durationMs: 5 * 60 * 1000,
  answers: makeAnswers(10, 10, 30_000),
}

export const PerfectShortSession = () => (
  <Surface style={{ maxWidth: 520 }}>
    <SessionComplete
      results={perfectResults}
      bestStreak={10}
      topics={{ strong: ['Maternal–Newborn', 'Pediatrics'], weak: [] }}
      onRestart={noop}
      onExit={noop}
    />
  </Surface>
)
