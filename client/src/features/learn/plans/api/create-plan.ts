import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  PlanSchema,
  type Plan,
  type CreatePlanInput,
} from '../types/plan.schema'
import { planKeys } from './get-plans'

export const createPlan = (input: CreatePlanInput): Promise<Plan> =>
  apiClient.post('/api/plans', PlanSchema, { body: input })

export const useCreatePlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all() })
    },
  })
}
