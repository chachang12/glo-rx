import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { ContributorMeSchema, type ContributorMe } from '../types/contribute.schema'

export const contributorKeys = {
  me: () => ['contributor', 'me'] as const,
  queue: (examCode: string | undefined) =>
    ['contributor', 'queue', examCode ?? 'all'] as const,
  earnings: () => ['contributor', 'earnings'] as const,
}

export const getContributorMe = (signal?: AbortSignal): Promise<ContributorMe> =>
  apiClient.get('/api/contributor/me', ContributorMeSchema, { signal })

export const useGetContributorMe = () =>
  useQuery({
    queryKey: contributorKeys.me(),
    queryFn: ({ signal }) => getContributorMe(signal),
  })
