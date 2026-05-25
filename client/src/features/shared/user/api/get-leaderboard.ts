import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { LeaderboardEntrySchema, type LeaderboardEntry } from '../types/user.schema'
import { userKeys } from './get-me'

const LeaderboardResponseSchema = z.array(LeaderboardEntrySchema)

export const getLeaderboard = (signal?: AbortSignal): Promise<LeaderboardEntry[]> =>
  apiClient.get('/api/user/leaderboard', LeaderboardResponseSchema, { signal })

export const useGetLeaderboard = () =>
  useQuery({
    queryKey: userKeys.leaderboard(),
    queryFn: ({ signal }) => getLeaderboard(signal),
  })
