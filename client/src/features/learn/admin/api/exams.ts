import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { examKeys } from '@/features/learn/exams'
import {
  AdminExamSchema,
  type AdminExam,
  type CreateExamInput,
  type UpdateExamInput,
} from '../types/admin.schema'
import { adminKeys } from './get-stats'

const AdminExamsResponseSchema = z.array(AdminExamSchema)

export const listAdminExams = (signal?: AbortSignal): Promise<AdminExam[]> =>
  apiClient.get('/api/admin/exams', AdminExamsResponseSchema, { signal })

export const useListAdminExams = () =>
  useQuery({ queryKey: adminKeys.exams(), queryFn: ({ signal }) => listAdminExams(signal) })

export const getAdminExam = (code: string, signal?: AbortSignal): Promise<AdminExam> =>
  apiClient.get(`/api/admin/exams/${encodeURIComponent(code)}`, AdminExamSchema, { signal })

export const useGetAdminExam = (code: string | undefined) =>
  useQuery({
    queryKey: code ? adminKeys.exam(code) : ['admin', '__noop__'],
    queryFn: ({ signal }) => getAdminExam(code!, signal),
    enabled: !!code,
  })

export const createAdminExam = (input: CreateExamInput): Promise<AdminExam> =>
  apiClient.post('/api/admin/exams', AdminExamSchema, { body: input })

export const useCreateAdminExam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAdminExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.exams() })
      queryClient.invalidateQueries({ queryKey: examKeys.visible() })
      queryClient.invalidateQueries({ queryKey: examKeys.all() })
    },
  })
}

interface UpdateAdminExamArgs {
  code: string
  updates: UpdateExamInput
}

export const updateAdminExam = ({ code, updates }: UpdateAdminExamArgs): Promise<AdminExam> =>
  apiClient.patch(`/api/admin/exams/${encodeURIComponent(code)}`, AdminExamSchema, {
    body: updates,
  })

export const useUpdateAdminExam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdminExam,
    onSuccess: (exam, { code }) => {
      queryClient.setQueryData(adminKeys.exam(code), exam)
      queryClient.invalidateQueries({ queryKey: adminKeys.exams() })
      queryClient.invalidateQueries({ queryKey: examKeys.visible() })
      queryClient.invalidateQueries({ queryKey: examKeys.all() })
    },
  })
}

const DeleteResponseSchema = z.unknown()

export const deleteAdminExam = (code: string) =>
  apiClient.del(`/api/admin/exams/${encodeURIComponent(code)}`, DeleteResponseSchema)

export const useDeleteAdminExam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAdminExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.exams() })
      queryClient.invalidateQueries({ queryKey: examKeys.visible() })
      queryClient.invalidateQueries({ queryKey: examKeys.all() })
    },
  })
}
