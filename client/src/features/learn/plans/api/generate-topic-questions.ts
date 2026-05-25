import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import type { PlanKind } from './get-readiness'

const GenerateTopicQuestionsResponseSchema = z.unknown()

export interface GenerateTopicQuestionsArgs {
  kind: PlanKind
  identifier: string
  topicId: string
  count?: number
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  instructions?: string
  typeWeights?: Record<string, number>
}

const apiBase = ({ kind, identifier }: GenerateTopicQuestionsArgs) =>
  kind === 'custom'
    ? `/api/custom-plans/${encodeURIComponent(identifier)}`
    : `/api/plans/${encodeURIComponent(identifier)}`

export const generateTopicQuestions = (args: GenerateTopicQuestionsArgs) => {
  const { topicId, count, difficulty, instructions, typeWeights } = args
  return apiClient.post(
    `${apiBase(args)}/topics/${encodeURIComponent(topicId)}/generate-questions`,
    GenerateTopicQuestionsResponseSchema,
    { body: { count, difficulty, instructions, typeWeights } }
  )
}

export const useGenerateTopicQuestions = () =>
  useMutation({ mutationFn: generateTopicQuestions })
