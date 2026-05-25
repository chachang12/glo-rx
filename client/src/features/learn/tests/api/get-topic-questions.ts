import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { QuestionTypeSchema } from '@/features/learn/exams'

const TopicQuestionSchema = z.object({
  id: z.string(),
  type: QuestionTypeSchema,
  stem: z.string(),
  options: z.union([
    z.record(z.string(), z.string()),
    z.array(z.string()),
  ]).nullable().optional(),
  answer: z.array(z.string()),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
})
export type TopicQuestion = z.infer<typeof TopicQuestionSchema>

const TopicQuestionsResponseSchema = z.object({
  questions: z.array(TopicQuestionSchema),
  topicLabel: z.string().optional(),
})
export type TopicQuestionsResponse = z.infer<typeof TopicQuestionsResponseSchema>

export interface GetTopicQuestionsArgs {
  topicId: string
  examCode?: string
  customPlanId?: string
}

export const getTopicQuestions = (
  { topicId, examCode, customPlanId }: GetTopicQuestionsArgs,
  signal?: AbortSignal
): Promise<TopicQuestionsResponse> => {
  const url = customPlanId
    ? `/api/custom-plans/${encodeURIComponent(customPlanId)}/topics/${encodeURIComponent(topicId)}/questions`
    : `/api/plans/${encodeURIComponent(examCode!)}/topics/${encodeURIComponent(topicId)}/questions`
  return apiClient.get(url, TopicQuestionsResponseSchema, { signal })
}

export const useGetTopicQuestions = (args: GetTopicQuestionsArgs | null) =>
  useQuery({
    queryKey: args
      ? ['tests', 'topic-questions', args]
      : ['tests', '__noop_tq__'],
    queryFn: ({ signal }) => getTopicQuestions(args!, signal),
    enabled: !!args && (!!args.customPlanId || !!args.examCode),
  })
