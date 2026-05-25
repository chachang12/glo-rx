import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { UnlinkResponseSchema, type UnlinkResponse } from '../types/telegram.schema'
import { userKeys } from '@/features/shared/user'

export const unlinkTelegram = (): Promise<UnlinkResponse> =>
  apiClient.post('/api/collect/telegram/unlink', UnlinkResponseSchema, { body: {} })

export const useUnlinkTelegram = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.me() })
    },
  })
}
