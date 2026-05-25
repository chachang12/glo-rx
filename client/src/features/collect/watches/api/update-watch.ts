import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { WatchSchema, type UpdateWatchInput, type Watch } from '../types/watch.schema'
import { watchKeys } from './get-watches'

export const updateWatch = (id: string, input: UpdateWatchInput): Promise<Watch> =>
  apiClient.patch(`/api/collect/watches/${encodeURIComponent(id)}`, WatchSchema, { body: input })

export const useUpdateWatch = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateWatchInput) => updateWatch(id, input),
    onSuccess: (watch) => {
      qc.setQueryData(watchKeys.detail(id), watch)
      qc.invalidateQueries({ queryKey: watchKeys.list() })
    },
  })
}
