import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { SuccessResponseSchema } from '@/lib/api/common-schemas'
import { IDLE_QUERY_KEY, useDeleteMutation, useResourceQuery } from '@/lib/api/hooks'
import {
  AdminOfficialTestSummarySchema,
  type AdminOfficialTestSummary,
} from '../types/admin.schema'
import { adminKeys } from './get-stats'

const ListResponseSchema = z.array(AdminOfficialTestSummarySchema)

export const listExamOfficialTests = (
  code: string,
  signal?: AbortSignal
): Promise<AdminOfficialTestSummary[]> =>
  apiClient.get(
    `/api/admin/exams/${encodeURIComponent(code)}/official-tests`,
    ListResponseSchema,
    { signal }
  )

export const useListExamOfficialTests = (code: string | undefined) =>
  useResourceQuery({
    queryKey: code ? adminKeys.examOfficialTests(code) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => listExamOfficialTests(code!, signal),
    enabled: !!code,
  })

interface CreateOfficialTestArgs {
  code: string
  body: unknown
}

const CreateResponseSchema = z.unknown()

export const createOfficialTest = ({ code, body }: CreateOfficialTestArgs) =>
  apiClient.post(
    `/api/admin/exams/${encodeURIComponent(code)}/official-tests`,
    CreateResponseSchema,
    { body }
  )

export const useCreateOfficialTest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOfficialTest,
    onSuccess: (_data, { code }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.examOfficialTests(code) })
    },
  })
}

export const deleteOfficialTest = (testId: string) =>
  apiClient.del(
    `/api/admin/official-tests/${encodeURIComponent(testId)}`,
    SuccessResponseSchema
  )

export const useDeleteOfficialTest = () =>
  useDeleteMutation({
    mutationFn: deleteOfficialTest,
    invalidateKeys: [adminKeys.exams()],
  })
