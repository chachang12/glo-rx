import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  GenerateBatchResultSchema,
  PromoteResultSchema,
  type GenerateBatchInput,
  type GenerateBatchResult,
  type PromoteResult,
} from '../types/opp.schema'

export const generationKeys = {
  examTopics: (examCode: string) => ['admin', 'exam-topics', examCode] as const,
}

const TopicsSchema = z.array(z.string())

export const listExamTopics = (
  examCode: string,
  signal?: AbortSignal
): Promise<string[]> =>
  apiClient.get(
    `/api/admin/exams/${encodeURIComponent(examCode)}/topics`,
    TopicsSchema,
    { signal }
  )

export const useListExamTopics = (examCode: string | undefined) =>
  useQuery({
    queryKey: examCode ? generationKeys.examTopics(examCode) : ['admin', '__noop_topics__'],
    queryFn: ({ signal }) => listExamTopics(examCode!, signal),
    enabled: !!examCode,
  })

interface GenerateBatchArgs {
  examCode: string
  input: GenerateBatchInput
}

export const generateBatch = ({
  examCode,
  input,
}: GenerateBatchArgs): Promise<GenerateBatchResult> =>
  apiClient.post(
    `/api/admin/generation/${encodeURIComponent(examCode)}/batch`,
    GenerateBatchResultSchema,
    { body: input }
  )

export const useGenerateBatch = () => useMutation({ mutationFn: generateBatch })

export const promoteQuestions = (questionIds: string[]): Promise<PromoteResult> =>
  apiClient.post('/api/admin/questions/promote', PromoteResultSchema, {
    body: { questionIds },
  })

export const usePromoteQuestions = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: promoteQuestions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exams'] })
    },
  })
}
