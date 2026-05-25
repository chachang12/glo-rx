import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { QuotaResponseSchema, type QuotaResponse } from '../types/ebay.schema'
import { ebayKeys } from './get-search'

export const getEbayQuota = (signal?: AbortSignal): Promise<QuotaResponse> =>
  apiClient.get('/api/collect/ebay/quota', QuotaResponseSchema, { signal })

export const useGetEbayQuota = (opts?: { refetchInterval?: number }) =>
  useQuery({
    queryKey: ebayKeys.quota(),
    queryFn: ({ signal }) => getEbayQuota(signal),
    refetchInterval: opts?.refetchInterval ?? 30_000,
  })
