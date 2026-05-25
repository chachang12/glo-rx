import { z } from 'zod'

export const SharedPlanSchema = z.object({
  examName: z.string(),
  examDate: z.string().datetime({ offset: true }).nullable(),
  topicCount: z.number(),
  topics: z.array(z.string()),
  documentCount: z.number(),
})
export type SharedPlan = z.infer<typeof SharedPlanSchema>

export const CreateCustomPlanInputSchema = z.object({
  examName: z.string().min(1),
  examDate: z.string().nullable().optional(),
  dailyGoal: z.number().nullable().optional(),
})
export type CreateCustomPlanInput = z.infer<typeof CreateCustomPlanInputSchema>

export const PublishResponseSchema = z.object({
  shareCode: z.string(),
})
export type PublishResponse = z.infer<typeof PublishResponseSchema>

export const EnrichedTopicSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  parentLabel: z.string().nullable().optional(),
  sourceChunks: z
    .array(
      z.object({
        documentId: z.string(),
        chunkIndex: z.number(),
        excerpt: z.string(),
      })
    )
    .optional(),
})
export type EnrichedTopic = z.infer<typeof EnrichedTopicSchema>

export const ExtractTopicsResponseSchema = z.object({
  topics: z.array(z.string()),
  enrichedTopics: z.array(EnrichedTopicSchema).optional(),
})
export type ExtractTopicsResponse = z.infer<typeof ExtractTopicsResponseSchema>
