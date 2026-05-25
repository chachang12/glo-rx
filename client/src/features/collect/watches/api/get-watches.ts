import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  WatchListSchema,
  WatchSchema,
  type Watch,
} from '../types/watch.schema'

export const watchKeys = {
  all: () => ['collect', 'watches'] as const,
  list: () => ['collect', 'watches', 'list'] as const,
  detail: (id: string) => ['collect', 'watches', id] as const,
  matches: (id: string) => ['collect', 'watches', id, 'matches'] as const,
}

export const getWatches = (signal?: AbortSignal): Promise<Watch[]> =>
  apiClient.get('/api/collect/watches', WatchListSchema, { signal })

export const useGetWatches = () =>
  useQuery({
    queryKey: watchKeys.list(),
    queryFn: ({ signal }) => getWatches(signal),
  })

export const getWatch = (id: string, signal?: AbortSignal): Promise<Watch> =>
  apiClient.get(`/api/collect/watches/${encodeURIComponent(id)}`, WatchSchema, { signal })

export const useGetWatch = (id: string | undefined) =>
  useQuery({
    queryKey: id ? watchKeys.detail(id) : ['collect', 'watches', '__idle__'],
    queryFn: ({ signal }) => getWatch(id!, signal),
    enabled: !!id,
  })
