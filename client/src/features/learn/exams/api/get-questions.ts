import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
import { QuestionSchema, type Question } from '../types/exam.schema'
import { examKeys } from './get-exams'

const QuestionsResponseSchema = z.array(QuestionSchema)

export interface GetQuestionsOptions {
  topic?: string
  limit?: number
}

export const getExamQuestions = (
  examCode: string,
  options: GetQuestionsOptions = {},
  signal?: AbortSignal
): Promise<Question[]> => {
  const params = new URLSearchParams()
  if (options.topic) params.set('topic', options.topic)
  if (options.limit) params.set('limit', String(options.limit))
  const query = params.toString()
  return apiClient.get(
    `/api/exams/${encodeURIComponent(examCode)}/questions${query ? `?${query}` : ''}`,
    QuestionsResponseSchema,
    { signal }
  )
}

export const useGetExamQuestions = (
  examCode: string | undefined,
  options: GetQuestionsOptions = {}
) =>
  useResourceQuery({
    queryKey: examCode ? examKeys.questions(examCode, options) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getExamQuestions(examCode!, options, signal),
    enabled: !!examCode,
  })
