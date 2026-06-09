import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { EarningsSchema, type Earnings } from '../types/contribute.schema'
import { contributorKeys } from './get-me'

export const getContributorEarnings = (signal?: AbortSignal): Promise<Earnings> =>
  apiClient.get('/api/contributor/earnings', EarningsSchema, { signal })

export const useGetContributorEarnings = () =>
  useQuery({
    queryKey: contributorKeys.earnings(),
    queryFn: ({ signal }) => getContributorEarnings(signal),
  })
