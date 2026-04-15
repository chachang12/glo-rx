// ── JSON Schemas for question and test validation ───────────────────────────

export interface QuestionShape {
  type: 'mcq' | 'sata' | 'ordered'
  stem: string
  options: Record<string, string> | string[]
  answer: string[]
  explanation?: string
  topics?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface TestShape {
  title: string
  description?: string
  timeLimit?: number | null
  questions: QuestionShape[]
}

export interface BulkQuestionsShape {
  questions: QuestionShape[]
}

// ── Validation ──────────────────────────────────────────────────────────────

const QUESTION_TYPES = ['mcq', 'sata', 'ordered'] as const
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export function validateQuestion(q: unknown, index?: number): string | null {
  const prefix = index !== undefined ? `Question ${index + 1}: ` : ''

  if (!q || typeof q !== 'object') return `${prefix}must be an object`

  const obj = q as Record<string, unknown>

  // type
  if (!obj.type) obj.type = 'mcq' // default
  if (!QUESTION_TYPES.includes(obj.type as typeof QUESTION_TYPES[number])) {
    return `${prefix}type must be one of: ${QUESTION_TYPES.join(', ')}`
  }

  // stem
  if (typeof obj.stem !== 'string' || !obj.stem.trim()) {
    return `${prefix}stem is required and must be a non-empty string`
  }

  // options
  if (obj.type === 'ordered') {
    if (!Array.isArray(obj.options) || obj.options.length < 2) {
      return `${prefix}ordered questions require options as an array with at least 2 items`
    }
    if (!obj.options.every((o: unknown) => typeof o === 'string')) {
      return `${prefix}ordered question options must all be strings`
    }
  } else {
    if (!obj.options || typeof obj.options !== 'object' || Array.isArray(obj.options)) {
      return `${prefix}options must be an object like { "A": "...", "B": "..." }`
    }
    const keys = Object.keys(obj.options)
    if (keys.length < 2) {
      return `${prefix}options must have at least 2 choices`
    }
    for (const key of keys) {
      if (typeof (obj.options as Record<string, unknown>)[key] !== 'string') {
        return `${prefix}option "${key}" must be a string`
      }
    }
  }

  // answer
  if (!Array.isArray(obj.answer) || obj.answer.length === 0) {
    return `${prefix}answer must be a non-empty array of strings`
  }
  if (!obj.answer.every((a: unknown) => typeof a === 'string')) {
    return `${prefix}all answer values must be strings`
  }

  // Validate answer keys exist in options
  if (obj.type !== 'ordered') {
    const optionKeys = Object.keys(obj.options as Record<string, unknown>)
    for (const a of obj.answer as string[]) {
      if (!optionKeys.includes(a)) {
        return `${prefix}answer "${a}" does not match any option key (${optionKeys.join(', ')})`
      }
    }
  }

  // mcq must have exactly 1 answer
  if (obj.type === 'mcq' && (obj.answer as string[]).length !== 1) {
    return `${prefix}mcq questions must have exactly 1 answer`
  }

  // explanation (optional)
  if (obj.explanation !== undefined && typeof obj.explanation !== 'string') {
    return `${prefix}explanation must be a string`
  }

  // topics (optional)
  if (obj.topics !== undefined) {
    if (!Array.isArray(obj.topics) || !obj.topics.every((t: unknown) => typeof t === 'string')) {
      return `${prefix}topics must be an array of strings`
    }
  }

  // difficulty (optional)
  if (obj.difficulty !== undefined) {
    if (!DIFFICULTIES.includes(obj.difficulty as typeof DIFFICULTIES[number])) {
      return `${prefix}difficulty must be one of: ${DIFFICULTIES.join(', ')}`
    }
  }

  return null
}

export function validateTest(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Request body must be an object'

  const obj = body as Record<string, unknown>

  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    return 'title is required and must be a non-empty string'
  }

  if (obj.description !== undefined && typeof obj.description !== 'string') {
    return 'description must be a string'
  }

  if (obj.timeLimit !== undefined && obj.timeLimit !== null) {
    if (typeof obj.timeLimit !== 'number' || obj.timeLimit < 1) {
      return 'timeLimit must be a positive number (minutes) or null'
    }
  }

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    return 'questions must be a non-empty array'
  }

  for (let i = 0; i < obj.questions.length; i++) {
    const err = validateQuestion(obj.questions[i], i)
    if (err) return err
  }

  return null
}

export function validateBulkQuestions(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Request body must be an object'

  const obj = body as Record<string, unknown>

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    return 'questions must be a non-empty array'
  }

  for (let i = 0; i < obj.questions.length; i++) {
    const err = validateQuestion(obj.questions[i], i)
    if (err) return err
  }

  return null
}
