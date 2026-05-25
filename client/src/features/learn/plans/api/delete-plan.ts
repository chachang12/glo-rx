import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { planKeys } from './get-plans'

const DeletePlanResponseSchema = z.unknown()

export const deletePlan = (examCode: string) =>
  apiClient.del(
    `/api/plans/${encodeURIComponent(examCode)}`,
    DeletePlanResponseSchema
  )

export const useDeletePlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: (_data, examCode) => {
      queryClient.removeQueries({ queryKey: planKeys.byExam(examCode) })
      queryClient.invalidateQueries({ queryKey: planKeys.list() })
    },
  })
}
