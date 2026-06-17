import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
import { SharedPlanSchema, type SharedPlan } from '../types/custom-plan.schema'

export const customPlanKeys = {
  all: () => ['custom-plans'] as const,
  shared: (shareCode: string) => ['custom-plans', 'shared', shareCode] as const,
}

export const getSharedPlan = (
  shareCode: string,
  signal?: AbortSignal
): Promise<SharedPlan> =>
  apiClient.get(
    `/api/custom-plans/shared/${encodeURIComponent(shareCode)}`,
    SharedPlanSchema,
    { signal }
  )

export const useGetSharedPlan = (shareCode: string | undefined) =>
  useResourceQuery({
    queryKey: shareCode ? customPlanKeys.shared(shareCode) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getSharedPlan(shareCode!, signal),
    enabled: !!shareCode,
  })
