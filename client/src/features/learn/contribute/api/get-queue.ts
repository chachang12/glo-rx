import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { QueueResponseSchema, type QueueResponse } from '../types/contribute.schema'
import { contributorKeys } from './get-me'

export const getContributorQueue = (
  examCode?: string,
  limit = 5,
  signal?: AbortSignal
): Promise<QueueResponse> => {
  const params = new URLSearchParams()
  if (examCode) params.set('examCode', examCode)
  params.set('limit', String(limit))
  const qs = params.toString()
  return apiClient.get(
    `/api/contributor/queue${qs ? `?${qs}` : ''}`,
    QueueResponseSchema,
    { signal }
  )
}

export const useGetContributorQueue = (examCode?: string, limit = 5) =>
  useQuery({
    queryKey: contributorKeys.queue(examCode),
    queryFn: ({ signal }) => getContributorQueue(examCode, limit, signal),
  })
