import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
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
  useQuery({
    queryKey: shareCode ? customPlanKeys.shared(shareCode) : ['custom-plans', '__noop__'],
    queryFn: ({ signal }) => getSharedPlan(shareCode!, signal),
    enabled: !!shareCode,
  })
