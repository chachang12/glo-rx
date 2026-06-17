// ── Canonical question-type vocabulary ──────────────────────────────────────
// Single source of truth shared by every schema and validator. Mongoose
// models (exam, test, question bank) and the runtime validators in
// schemas.ts all import from here so the supported set never drifts between
// storage and validation.

export const QUESTION_TYPES = [
  'mcq',
  'sata',
  'ordered',
  'calculation',
  'exhibit',
  'priority',
  'fib',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

// The question types a plan offers by default until an admin widens the set.
export const DEFAULT_ALLOWED_TYPES: readonly QuestionType[] = ['mcq']

// Types that render as A/B/C/D options with exactly one correct key.
export const SINGLE_ANSWER_TYPES = new Set<QuestionType>([
  'mcq',
  'calculation',
  'exhibit',
  'priority',
])

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
