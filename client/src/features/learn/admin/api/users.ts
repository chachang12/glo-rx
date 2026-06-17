import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { SuccessResponseSchema } from '@/lib/api/common-schemas'
import { useDeleteMutation } from '@/lib/api/hooks'
import { AdminUserSchema, type AdminUser } from '../types/admin.schema'
import { adminKeys } from './get-stats'

const UsersResponseSchema = z.array(AdminUserSchema)

export const listAdminUsers = (signal?: AbortSignal): Promise<AdminUser[]> =>
  apiClient.get('/api/admin/users', UsersResponseSchema, { signal })

export const useListAdminUsers = () =>
  useQuery({ queryKey: adminKeys.users(), queryFn: ({ signal }) => listAdminUsers(signal) })

export const deleteAdminUser = (userId: string) =>
  apiClient.del(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    SuccessResponseSchema
  )

export const useDeleteAdminUser = () =>
  useDeleteMutation({
    mutationFn: deleteAdminUser,
    invalidateKeys: [adminKeys.users(), adminKeys.stats()],
  })
