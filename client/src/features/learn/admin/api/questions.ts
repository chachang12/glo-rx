import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  AdminQuestionSchema,
  FlaggedQuestionSchema,
  type FlaggedQuestion,
} from '../types/admin.schema'
import { adminKeys } from './get-stats'

const QuestionsPageSchema = z.object({
  items: z.array(AdminQuestionSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
})
export type QuestionsPage = z.infer<typeof QuestionsPageSchema>

export type QuestionFilters = {
  q?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  topic?: string
  flagged?: 'flagged' | 'clean'
}

const buildQuery = (filters: QuestionFilters, cursor?: string, limit = 25) => {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.topic) params.set('topic', filters.topic)
  if (filters.flagged === 'flagged') params.set('flagged', 'true')
  else if (filters.flagged === 'clean') params.set('flagged', 'false')
  if (cursor) params.set('cursor', cursor)
  params.set('limit', String(limit))
  return params.toString()
}

export const listExamQuestionsPage = (
  code: string,
  filters: QuestionFilters,
  cursor: string | undefined,
  signal?: AbortSignal
): Promise<QuestionsPage> =>
  apiClient.get(
    `/api/admin/exams/${encodeURIComponent(code)}/questions?${buildQuery(filters, cursor)}`,
    QuestionsPageSchema,
    { signal }
  )

export const useListExamQuestionsPaged = (
  code: string | undefined,
  filters: QuestionFilters
) =>
  useInfiniteQuery({
    queryKey: code
      ? [...adminKeys.examQuestions(code), 'paged', filters]
      : ['admin', '__noop_q__'],
    queryFn: ({ pageParam, signal }) =>
      listExamQuestionsPage(code!, filters, pageParam, signal),
    enabled: !!code,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

export const useExamQuestionCount = (code: string | undefined) =>
  useQuery({
    queryKey: code ? [...adminKeys.examQuestions(code), 'count'] : ['admin', '__noop_q_count__'],
    queryFn: ({ signal }) =>
      apiClient
        .get(
          `/api/admin/exams/${encodeURIComponent(code!)}/questions?limit=1`,
          QuestionsPageSchema,
          { signal }
        )
        .then((r) => r.total),
    enabled: !!code,
  })

const FlaggedResponseSchema = z.array(FlaggedQuestionSchema)

export const listFlaggedQuestions = (signal?: AbortSignal): Promise<FlaggedQuestion[]> =>
  apiClient.get('/api/admin/flagged-questions', FlaggedResponseSchema, { signal })

export const useListFlaggedQuestions = () =>
  useQuery({
    queryKey: adminKeys.flaggedQuestions(),
    queryFn: ({ signal }) => listFlaggedQuestions(signal),
  })

const DeleteResponseSchema = z.unknown()

export const deleteAdminQuestion = (questionId: string) =>
  apiClient.del(
    `/api/admin/questions/${encodeURIComponent(questionId)}`,
    DeleteResponseSchema
  )

export const useDeleteAdminQuestion = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAdminQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.flaggedQuestions() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'exams'] })
    },
  })
}

interface BulkUpsertArgs {
  code: string
  questions: unknown[]
}

const BulkResponseSchema = z.unknown()

export const bulkUpsertQuestions = ({ code, questions }: BulkUpsertArgs) =>
  apiClient.post(
    `/api/admin/exams/${encodeURIComponent(code)}/questions/bulk`,
    BulkResponseSchema,
    { body: { questions } }
  )

export const useBulkUpsertQuestions = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bulkUpsertQuestions,
    onSuccess: (_data, { code }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.examQuestions(code) })
    },
  })
}
