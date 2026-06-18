// Runtime types for an in-progress practice session. These describe the shape
// the quiz UI works with after questions have been adapted from their various
// API sources (official tests, community tests, topic practice, question bank).

export type QuestionType =
  | 'mcq'
  | 'sata'
  | 'ordered'
  | 'calculation'
  | 'exhibit'
  | 'priority'
  | 'fib'

export type GradingMode = 'instant' | 'end'

/** Question types where exactly one option is correct (single-select cards). */
export const SINGLE_ANSWER_TYPES = new Set<QuestionType>([
  'mcq',
  'calculation',
  'exhibit',
  'priority',
])

export interface SessionQuestion {
  _id: string
  type: QuestionType
  stem: string
  options: Record<string, string> | string[]
  answer: string[]
  explanation?: string
  topics?: string[]
  difficulty?: string
  /** The caller's own generated question, still awaiting SME review. */
  pendingReview?: boolean
}

export interface SessionAnswer {
  questionId: string
  selected: string[]
  correct: boolean
  timeMs: number
}

export interface SessionResults {
  totalQuestions: number
  correctCount: number
  answers: SessionAnswer[]
  durationMs: number
}

export interface TopicBreakdown {
  strong: string[]
  weak: string[]
}
