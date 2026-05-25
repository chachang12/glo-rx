import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { DeleteResponseSchema } from '../types/watch.schema'
import { watchKeys } from './get-watches'

export const deleteWatch = (id: string) =>
  apiClient.del(`/api/collect/watches/${encodeURIComponent(id)}`, DeleteResponseSchema)

export const useDeleteWatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteWatch,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: watchKeys.detail(id) })
      qc.invalidateQueries({ queryKey: watchKeys.list() })
    },
  })
}
