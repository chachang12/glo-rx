import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  PlanSchema,
  type Plan,
  type UpdatePlanInput,
} from '../types/plan.schema'
import { planKeys } from './get-plans'

interface UpdatePlanArgs {
  examCode: string
  updates: UpdatePlanInput
}

export const updatePlan = ({ examCode, updates }: UpdatePlanArgs): Promise<Plan> =>
  apiClient.patch(`/api/plans/${encodeURIComponent(examCode)}`, PlanSchema, {
    body: updates,
  })

export const useUpdatePlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePlan,
    onSuccess: (plan, { examCode }) => {
      queryClient.setQueryData(planKeys.byExam(examCode), plan)
      queryClient.invalidateQueries({ queryKey: planKeys.list() })
    },
  })
}
