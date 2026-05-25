import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { planKeys } from '@/features/learn/plans'
import {
  PublishResponseSchema,
  type PublishResponse,
} from '../types/custom-plan.schema'

export const publishCustomPlan = (planId: string): Promise<PublishResponse> =>
  apiClient.post(
    `/api/custom-plans/${encodeURIComponent(planId)}/publish`,
    PublishResponseSchema
  )

export const usePublishCustomPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: publishCustomPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.list() })
    },
  })
}

const UnpublishResponseSchema = z.unknown()

export const unpublishCustomPlan = (planId: string) =>
  apiClient.post(
    `/api/custom-plans/${encodeURIComponent(planId)}/unpublish`,
    UnpublishResponseSchema
  )

export const useUnpublishCustomPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: unpublishCustomPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.list() })
    },
  })
}
