import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
import { PlanSchema, type Plan } from '../types/plan.schema'
import { planKeys } from './get-plans'

export const getPlan = (examCode: string, signal?: AbortSignal): Promise<Plan> =>
  apiClient.get(`/api/plans/${encodeURIComponent(examCode)}`, PlanSchema, { signal })

export const useGetPlan = (examCode: string | undefined) =>
  useResourceQuery({
    queryKey: examCode ? planKeys.byExam(examCode) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getPlan(examCode!, signal),
    enabled: !!examCode,
  })
