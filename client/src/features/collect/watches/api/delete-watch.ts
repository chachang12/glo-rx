import { apiClient } from '@/lib/api/client'
import { DeleteResponseSchema } from '@/lib/api/common-schemas'
import { useDeleteMutation } from '@/lib/api/hooks'
import { watchKeys } from './get-watches'

export const deleteWatch = (id: string) =>
  apiClient.del(`/api/collect/watches/${encodeURIComponent(id)}`, DeleteResponseSchema)

export const useDeleteWatch = () =>
  useDeleteMutation({
    mutationFn: deleteWatch,
    removeKeys: (_data, id) => [watchKeys.detail(id)],
    invalidateKeys: [watchKeys.list()],
  })
