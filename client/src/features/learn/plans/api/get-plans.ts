import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { PlanSchema, type Plan } from '../types/plan.schema'

export const planKeys = {
  all: () => ['plans'] as const,
  list: () => ['plans', 'list'] as const,
  byExam: (examCode: string) => ['plans', 'byExam', examCode] as const,
}

const PlansResponseSchema = z.array(PlanSchema)

export const getPlans = (signal?: AbortSignal): Promise<Plan[]> =>
  apiClient.get('/api/plans', PlansResponseSchema, { signal })

export const useGetPlans = () =>
  useQuery({
    queryKey: planKeys.list(),
    queryFn: ({ signal }) => getPlans(signal),
  })
