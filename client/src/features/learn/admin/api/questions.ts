import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  AdminQuestionSchema,
  FlaggedQuestionSchema,
  type AdminQuestion,
  type FlaggedQuestion,
} from '../types/admin.schema'
import { adminKeys } from './get-stats'

const QuestionsResponseSchema = z.array(AdminQuestionSchema)

export const listExamQuestions = (
  code: string,
  signal?: AbortSignal
): Promise<AdminQuestion[]> =>
  apiClient.get(
    `/api/admin/exams/${encodeURIComponent(code)}/questions`,
    QuestionsResponseSchema,
    { signal }
  )

export const useListExamQuestions = (code: string | undefined) =>
  useQuery({
    queryKey: code ? adminKeys.examQuestions(code) : ['admin', '__noop_q__'],
    queryFn: ({ signal }) => listExamQuestions(code!, signal),
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
