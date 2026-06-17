import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
import type { PlanKind } from './get-readiness'

export const RoadmapDaySchema = z.object({
  _id: z.string(),
  planId: z.string().optional(),
  dayNumber: z.number(),
  date: z.string().datetime({ offset: true }),
  phase: z.enum(['learn', 'review', 'simulate']),
  activityType: z.enum([
    'flashcard',
    'daily-quiz',
    'topic-quiz',
    'subset-test',
    'composite-test',
  ]),
  topicIds: z.array(z.string()).default([]),
  topicLabels: z.array(z.string()).default([]),
  label: z.string(),
  completed: z.boolean().default(false),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})
export type RoadmapDayData = z.infer<typeof RoadmapDaySchema>

const RoadmapResponseSchema = z.array(RoadmapDaySchema)

interface RoadmapArgs {
  kind: PlanKind
  identifier: string
}

const apiBase = ({ kind, identifier }: RoadmapArgs) =>
  kind === 'custom'
    ? `/api/custom-plans/${encodeURIComponent(identifier)}`
    : `/api/plans/${encodeURIComponent(identifier)}`

const roadmapKey = ({ kind, identifier }: RoadmapArgs) =>
  ['plans', kind, identifier, 'roadmap'] as const

export const getRoadmap = (
  args: RoadmapArgs,
  signal?: AbortSignal
): Promise<RoadmapDayData[]> =>
  apiClient.get(`${apiBase(args)}/roadmap`, RoadmapResponseSchema, { signal })

export const useGetRoadmap = (args: RoadmapArgs | null) =>
  useResourceQuery({
    queryKey: args ? roadmapKey(args) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getRoadmap(args!, signal),
    enabled: !!args,
  })

export const generateRoadmap = (args: RoadmapArgs): Promise<RoadmapDayData[]> =>
  apiClient.post(`${apiBase(args)}/roadmap/generate`, RoadmapResponseSchema)

export const useGenerateRoadmap = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateRoadmap,
    onSuccess: (data, args) => {
      queryClient.setQueryData(roadmapKey(args), data)
    },
  })
}

interface MarkDayCompleteArgs extends RoadmapArgs {
  dayNumber: number
}

const MarkCompleteResponseSchema = z.unknown()

export const markRoadmapDayComplete = ({ kind, identifier, dayNumber }: MarkDayCompleteArgs) =>
  apiClient.patch(
    `${apiBase({ kind, identifier })}/roadmap/${dayNumber}/complete`,
    MarkCompleteResponseSchema
  )

export const useMarkRoadmapDayComplete = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markRoadmapDayComplete,
    onSuccess: (_data, { kind, identifier }) => {
      queryClient.invalidateQueries({ queryKey: roadmapKey({ kind, identifier }) })
    },
  })
}
