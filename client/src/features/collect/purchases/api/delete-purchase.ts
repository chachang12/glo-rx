import { apiClient } from '@/lib/api/client'
import { DeleteResponseSchema } from '@/lib/api/common-schemas'
import { useDeleteMutation } from '@/lib/api/hooks'
import { purchaseKeys } from './create-purchase'

export const deletePurchase = (id: string) =>
  apiClient.del(`/api/collect/purchases/${encodeURIComponent(id)}`, DeleteResponseSchema)

export const useDeletePurchase = () =>
  useDeleteMutation({
    mutationFn: deletePurchase,
    invalidateKeys: [purchaseKeys.all()],
  })
