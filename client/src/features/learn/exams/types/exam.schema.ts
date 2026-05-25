import { z } from 'zod'

export const QUESTION_TYPES = [
  'mcq',
  'sata',
  'ordered',
  'calculation',
  'exhibit',
  'priority',
  'fib',
] as const

export const ExamVisibilitySchema = z.enum(['hidden', 'coming-soon', 'live'])

export const ExamSchema = z.object({
  _id: z.string(),
  code: z.string(),
  label: z.string(),
  category: z.string(),
  description: z.string().default(''),
  active: z.boolean().default(true),
  visibility: ExamVisibilitySchema.optional(),
  featured: z.boolean().optional(),
})
export type Exam = z.infer<typeof ExamSchema>

export const OfficialTestSummarySchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  questionCount: z.number(),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type OfficialTestSummary = z.infer<typeof OfficialTestSummarySchema>

export const QuestionTypeSchema = z.enum(QUESTION_TYPES)
export type QuestionType = z.infer<typeof QuestionTypeSchema>

export const QuestionSchema = z.object({
  _id: z.string(),
  type: QuestionTypeSchema.default('mcq'),
  stem: z.string(),
  options: z.union([z.record(z.string(), z.string()), z.array(z.string())]),
  answer: z.array(z.string()),
  explanation: z.string().default(''),
  topics: z.array(z.string()).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  examCode: z.string().optional(),
})
export type Question = z.infer<typeof QuestionSchema>

export const OfficialTestSchema = z.object({
  _id: z.string(),
  examCode: z.string(),
  title: z.string(),
  description: z.string().default(''),
  timeLimit: z.number().nullable().optional(),
  questions: z.array(QuestionSchema),
  questionCount: z.number(),
})
export type OfficialTest = z.infer<typeof OfficialTestSchema>
