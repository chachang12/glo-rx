import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
import {
  WatchMatchListSchema,
  type WatchMatch,
} from '../types/watch.schema'
import { watchKeys } from './get-watches'

export const getWatchMatches = (
  id: string,
  opts?: { limit?: number; before?: string },
  signal?: AbortSignal
): Promise<WatchMatch[]> => {
  const qp = new URLSearchParams()
  if (opts?.limit) qp.set('limit', String(opts.limit))
  if (opts?.before) qp.set('before', opts.before)
  const qs = qp.toString()
  return apiClient.get(
    `/api/collect/watches/${encodeURIComponent(id)}/matches${qs ? `?${qs}` : ''}`,
    WatchMatchListSchema,
    { signal }
  )
}

export const useGetWatchMatches = (id: string | undefined, limit = 50) =>
  useResourceQuery({
    queryKey: id ? [...watchKeys.matches(id), { limit }] : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getWatchMatches(id!, { limit }, signal),
    enabled: !!id,
  })
