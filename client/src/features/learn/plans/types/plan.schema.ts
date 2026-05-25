import { z } from 'zod'

export const PlanTypeSchema = z.enum(['standard', 'custom'])
export type PlanType = z.infer<typeof PlanTypeSchema>

export const PlanStatusSchema = z.enum(['active', 'paused', 'completed'])
export type PlanStatus = z.infer<typeof PlanStatusSchema>

export const PlanTierSchema = z.enum(['free', 'pro'])
export type PlanTier = z.infer<typeof PlanTierSchema>

export const PlanSchema = z.object({
  _id: z.string(),
  authId: z.string().optional(),
  examCode: z.string(),
  type: PlanTypeSchema.default('standard'),
  examName: z.string().nullable().optional(),
  examDate: z.string().datetime({ offset: true }).nullable().optional(),
  dailyGoal: z.number().nullable().optional(),
  status: PlanStatusSchema.default('active'),
  totalDocumentSize: z.number().optional(),
  isPublished: z.boolean().optional(),
  shareCode: z.string().nullable().optional(),
  tier: PlanTierSchema.optional(),
  usageCount: z.number().optional(),
  usageResetAt: z.string().datetime({ offset: true }).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})
export type Plan = z.infer<typeof PlanSchema>

export const CreatePlanInputSchema = z.object({
  examCode: z.string(),
  examName: z.string().optional(),
  type: PlanTypeSchema.optional(),
})
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>

export const UpdatePlanInputSchema = z.object({
  examDate: z.string().nullable().optional(),
  dailyGoal: z.number().nullable().optional(),
  status: PlanStatusSchema.optional(),
  isPublished: z.boolean().optional(),
  examName: z.string().optional(),
})
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>
