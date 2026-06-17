import { apiClient } from '@/lib/api/client'
import { SuccessResponseSchema } from '@/lib/api/common-schemas'
import { useDeleteMutation } from '@/lib/api/hooks'
import { planKeys } from './get-plans'

export const deletePlan = (examCode: string) =>
  apiClient.del(
    `/api/plans/${encodeURIComponent(examCode)}`,
    SuccessResponseSchema
  )

export const useDeletePlan = () =>
  useDeleteMutation({
    mutationFn: deletePlan,
    removeKeys: (_data, examCode) => [planKeys.byExam(examCode)],
    invalidateKeys: [planKeys.list()],
  })
