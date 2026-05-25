import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { purchaseKeys } from './create-purchase'

const DeleteResponseSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})

export const deletePurchase = (id: string) =>
  apiClient.del(`/api/collect/purchases/${encodeURIComponent(id)}`, DeleteResponseSchema)

export const useDeletePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePurchase,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all() })
    },
  })
}
