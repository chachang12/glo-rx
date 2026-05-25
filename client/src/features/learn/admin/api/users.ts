import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { AdminUserSchema, type AdminUser } from '../types/admin.schema'
import { adminKeys } from './get-stats'

const UsersResponseSchema = z.array(AdminUserSchema)

export const listAdminUsers = (signal?: AbortSignal): Promise<AdminUser[]> =>
  apiClient.get('/api/admin/users', UsersResponseSchema, { signal })

export const useListAdminUsers = () =>
  useQuery({ queryKey: adminKeys.users(), queryFn: ({ signal }) => listAdminUsers(signal) })

const DeleteUserResponseSchema = z.object({ success: z.boolean() })

export const deleteAdminUser = (userId: string) =>
  apiClient.del(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    DeleteUserResponseSchema
  )

export const useDeleteAdminUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}
