import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { userKeys } from '@/features/shared/user'
import {
  RedeemAdvancedKeyResponseSchema,
  type RedeemAdvancedKeyInput,
  type RedeemAdvancedKeyResponse,
} from '../types/advanced.schema'

export const redeemAdvancedKey = (
  input: RedeemAdvancedKeyInput,
): Promise<RedeemAdvancedKeyResponse> =>
  apiClient.post('/api/collect/advanced/redeem', RedeemAdvancedKeyResponseSchema, {
    body: input,
  })

export const useRedeemAdvancedKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: redeemAdvancedKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.me() })
    },
  })
}
