import { z } from 'zod'
import { ExamSchema, QuestionSchema } from '@/features/learn/exams'

export const AdminStatsSchema = z.object({
  users: z.number(),
  plans: z.number(),
  sessions: z.number(),
  exams: z.number(),
})
export type AdminStats = z.infer<typeof AdminStatsSchema>

export const AdminUserSchema = z.object({
  _id: z.string(),
  authId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string().nullable().optional(),
  role: z.enum(['user', 'admin']),
  licenses: z
    .object({
      aiGeneration: z.boolean(),
      customPlans: z.boolean(),
    })
    .optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type AdminUser = z.infer<typeof AdminUserSchema>

// Admin exam is the same shape as the public exam but includes admin-only fields.
export const AdminExamSchema = ExamSchema.extend({
  topics: z.array(z.string()).default([]),
  aiReferenceText: z.string().default(''),
  aiReferenceFileName: z.string().nullable().optional(),
  allowedQuestionTypes: z.array(z.string()).optional(),
})
export type AdminExam = z.infer<typeof AdminExamSchema>

export const CreateExamInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
  topics: z.array(z.string()).optional(),
  aiReferenceText: z.string().optional(),
})
export type CreateExamInput = z.infer<typeof CreateExamInputSchema>

export const UpdateExamInputSchema = z.object({
  label: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  visibility: z.enum(['hidden', 'coming-soon', 'live']).optional(),
  featured: z.boolean().optional(),
  topics: z.array(z.string()).optional(),
  aiReferenceText: z.string().optional(),
  aiReferenceFileName: z.string().nullable().optional(),
  allowedQuestionTypes: z.array(z.string()).optional(),
})
export type UpdateExamInput = z.infer<typeof UpdateExamInputSchema>

export const AdminOfficialTestSummarySchema = z.object({
  _id: z.string(),
  examCode: z.string().optional(),
  title: z.string(),
  description: z.string().optional().default(''),
  questionCount: z.number(),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type AdminOfficialTestSummary = z.infer<typeof AdminOfficialTestSummarySchema>

export const FlaggedQuestionSchema = z.object({
  _id: z.string(),
  type: z.string(),
  stem: z.string(),
  reportCount: z.number(),
  reportedBy: z.array(z.string()).optional(),
  testId: z.string().nullable(),
  testTitle: z.string().nullable(),
  examCode: z.string(),
  source: z.enum(['question-bank', 'official-test']),
})
export type FlaggedQuestion = z.infer<typeof FlaggedQuestionSchema>

export const AdminQuestionSchema = QuestionSchema.extend({
  reportCount: z.number().optional(),
  reportedBy: z.array(z.string()).optional(),
})
export type AdminQuestion = z.infer<typeof AdminQuestionSchema>
