import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
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
  useQuery({
    queryKey: code ? adminKeys.examOfficialTests(code) : ['admin', '__noop_ot__'],
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

const DeleteResponseSchema = z.unknown()

export const deleteOfficialTest = (testId: string) =>
  apiClient.del(
    `/api/admin/official-tests/${encodeURIComponent(testId)}`,
    DeleteResponseSchema
  )

export const useDeleteOfficialTest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteOfficialTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exams'] })
    },
  })
}
