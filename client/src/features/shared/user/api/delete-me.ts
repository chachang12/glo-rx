import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { userKeys } from './get-me'

const DeleteMeResponseSchema = z.unknown()

export const deleteMe = (): Promise<unknown> =>
  apiClient.del('/api/user/me', DeleteMeResponseSchema)

export const useDeleteMe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMe,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: userKeys.me() })
    },
  })
}
