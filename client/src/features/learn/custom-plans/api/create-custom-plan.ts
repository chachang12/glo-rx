import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { PlanSchema, planKeys, type Plan } from '@/features/learn/plans'
import type { CreateCustomPlanInput } from '../types/custom-plan.schema'

export const createCustomPlan = (input: CreateCustomPlanInput): Promise<Plan> =>
  apiClient.post('/api/custom-plans', PlanSchema, { body: input })

export const useCreateCustomPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.list() })
    },
  })
}
