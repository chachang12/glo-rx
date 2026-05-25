import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { PlanSchema, type Plan } from '../types/plan.schema'
import { planKeys } from './get-plans'

export const getPlan = (examCode: string, signal?: AbortSignal): Promise<Plan> =>
  apiClient.get(`/api/plans/${encodeURIComponent(examCode)}`, PlanSchema, { signal })

export const useGetPlan = (examCode: string | undefined) =>
  useQuery({
    queryKey: examCode ? planKeys.byExam(examCode) : ['plans', '__noop__'],
    queryFn: ({ signal }) => getPlan(examCode!, signal),
    enabled: !!examCode,
  })
