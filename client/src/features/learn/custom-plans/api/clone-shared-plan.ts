import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { PlanSchema, planKeys, type Plan } from '@/features/learn/plans'

export const cloneSharedPlan = (shareCode: string): Promise<Plan> =>
  apiClient.post(
    `/api/custom-plans/shared/${encodeURIComponent(shareCode)}/clone`,
    PlanSchema
  )

export const useCloneSharedPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cloneSharedPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.list() })
    },
  })
}
