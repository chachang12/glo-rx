import { z } from 'zod'
import { QuestionSchema } from '@/features/learn/exams'

export const CommunityTestSummarySchema = z.object({
  _id: z.string(),
  examCode: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  tags: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  questionCount: z.number(),
  timesPlayed: z.number().default(0),
  isPublic: z.boolean().default(true),
  createdBy: z.string().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type CommunityTestSummary = z.infer<typeof CommunityTestSummarySchema>

export const CommunityTestSchema = CommunityTestSummarySchema.extend({
  questions: z.array(QuestionSchema),
})
export type CommunityTest = z.infer<typeof CommunityTestSchema>

export const TestListResponseSchema = z.object({
  tests: z.array(CommunityTestSummarySchema),
  total: z.number(),
})
export type TestListResponse = z.infer<typeof TestListResponseSchema>
