import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { WatchSchema, type CreateWatchInput, type Watch } from '../types/watch.schema'
import { watchKeys } from './get-watches'

export const createWatch = (input: CreateWatchInput): Promise<Watch> =>
  apiClient.post('/api/collect/watches', WatchSchema, { body: input })

export const useCreateWatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: watchKeys.list() })
    },
  })
}
