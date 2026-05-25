import { z } from 'zod'

export const SessionAnswerSchema = z.object({
  questionId: z.string(),
  selected: z.array(z.string()),
  correct: z.boolean(),
  timeMs: z.number().nullable().optional(),
})
export type SessionAnswer = z.infer<typeof SessionAnswerSchema>

export const SessionSchema = z.object({
  _id: z.string(),
  authId: z.string().optional(),
  examCode: z.string(),
  answers: z.array(SessionAnswerSchema),
  totalQuestions: z.number(),
  correctCount: z.number(),
  durationMs: z.number().nullable().optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type Session = z.infer<typeof SessionSchema>

export const CreateSessionInputSchema = z.object({
  examCode: z.string(),
  answers: z.array(SessionAnswerSchema),
  totalQuestions: z.number(),
  correctCount: z.number(),
  durationMs: z.number().optional(),
})
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>
