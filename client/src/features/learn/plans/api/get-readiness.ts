import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'

export const TopicReadinessSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional().default(''),
  mastery: z.number(),
  questionsAnswered: z.number(),
  correctCount: z.number(),
  hasSourceExcerpts: z.boolean().optional(),
  generatedQuestionCount: z.number().optional(),
})
export type TopicReadiness = z.infer<typeof TopicReadinessSchema>

export const ReadinessSchema = z.object({
  readiness: z.number(),
  topicCount: z.number(),
  topics: z.array(TopicReadinessSchema),
  allowedQuestionTypes: z.array(z.string()).optional(),
})
export type Readiness = z.infer<typeof ReadinessSchema>

export type PlanKind = 'standard' | 'custom'

interface ReadinessArgs {
  kind: PlanKind
  identifier: string
}

const apiBase = ({ kind, identifier }: ReadinessArgs) =>
  kind === 'custom'
    ? `/api/custom-plans/${encodeURIComponent(identifier)}`
    : `/api/plans/${encodeURIComponent(identifier)}`

export const getReadiness = (
  args: ReadinessArgs,
  signal?: AbortSignal
): Promise<Readiness> =>
  apiClient.get(`${apiBase(args)}/readiness`, ReadinessSchema, { signal })

export const useGetReadiness = (args: ReadinessArgs | null) =>
  useQuery({
    queryKey: args ? ['plans', args.kind, args.identifier, 'readiness'] : ['plans', '__noop_r__'],
    queryFn: ({ signal }) => getReadiness(args!, signal),
    enabled: !!args,
  })
