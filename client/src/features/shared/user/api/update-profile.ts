import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  AppUserSchema,
  type AppUser,
  type UpdateProfileInput,
} from '../types/user.schema'
import { userKeys } from './get-me'

export const updateProfile = (input: UpdateProfileInput): Promise<AppUser> =>
  apiClient.patch('/api/user/me', AppUserSchema, { body: input })

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.me(), data)
    },
  })
}
