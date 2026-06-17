import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  ReviewSubmissionSchema,
  type ReviewSubmission,
} from '../types/contribute.schema'
import { contributorKeys } from './get-me'

export type SubmitReviewInput = {
  questionId: string
  vote: 'approve' | 'reject'
  comment: string | null
  dwellMs: number
}

export const submitReview = (input: SubmitReviewInput): Promise<ReviewSubmission> =>
  apiClient.post('/api/contributor/review', ReviewSubmissionSchema, { body: input })

export const useSubmitReview = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contributorKeys.queues() })
      qc.invalidateQueries({ queryKey: contributorKeys.me() })
      qc.invalidateQueries({ queryKey: contributorKeys.earnings() })
    },
  })
}

const SkipResponseSchema = z.object({ ok: z.boolean() })

export const skipQuestion = (questionId: string) =>
  apiClient.post('/api/contributor/skip', SkipResponseSchema, { body: { questionId } })

export const useSkipQuestion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: skipQuestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contributorKeys.queues() })
    },
  })
}
