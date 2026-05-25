import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { AppUserSchema, type AppUser } from '../types/user.schema'

export const userKeys = {
  me: () => ['user', 'me'] as const,
  stats: () => ['user', 'me', 'stats'] as const,
  leaderboard: () => ['user', 'leaderboard'] as const,
  search: (q: string) => ['user', 'search', q] as const,
}

export const getMe = (signal?: AbortSignal): Promise<AppUser> =>
  apiClient.get('/api/user/me', AppUserSchema, { signal })

export const useGetMe = () =>
  useQuery({
    queryKey: userKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
  })
