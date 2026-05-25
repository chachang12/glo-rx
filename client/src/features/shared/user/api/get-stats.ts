import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { UserStatsSchema, type UserStats } from '../types/user.schema'
import { userKeys } from './get-me'

export const getMyStats = (signal?: AbortSignal): Promise<UserStats> =>
  apiClient.get('/api/user/me/stats', UserStatsSchema, { signal })

export const useGetMyStats = () =>
  useQuery({
    queryKey: userKeys.stats(),
    queryFn: ({ signal }) => getMyStats(signal),
  })
