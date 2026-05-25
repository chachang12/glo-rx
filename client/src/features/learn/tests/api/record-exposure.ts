import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'

const RecordExposureResponseSchema = z.object({
  recorded: z.number(),
})

export const recordExposure = (questionIds: string[]) =>
  apiClient.post('/api/exams/exposure', RecordExposureResponseSchema, {
    body: { questionIds },
  })

export const useRecordExposure = () =>
  useMutation({ mutationFn: recordExposure })

const RecordAnswerResponseSchema = z.unknown()

interface RecordAnswerInput {
  questionId: string
  correct: boolean
}

export const recordAnswer = (input: RecordAnswerInput) =>
  apiClient.post('/api/exams/exposure/answer', RecordAnswerResponseSchema, {
    body: input,
  })

export const useRecordAnswer = () =>
  useMutation({ mutationFn: recordAnswer })
