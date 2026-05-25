import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  AspectsResponseSchema,
  type AspectsResponse,
} from '../types/ebay.schema'
import { ebayKeys } from './get-search'

export const getEbayAspects = (
  categoryId: string,
  q?: string,
  signal?: AbortSignal
): Promise<AspectsResponse> => {
  const qp = new URLSearchParams({ categoryId })
  if (q) qp.set('q', q)
  return apiClient.get(`/api/collect/ebay/aspects?${qp.toString()}`, AspectsResponseSchema, { signal })
}

export const useGetEbayAspects = (categoryId: string | undefined, q?: string) =>
  useQuery({
    queryKey: categoryId ? ebayKeys.aspects(categoryId, q) : ['collect', 'ebay', 'aspects', '__idle__'],
    queryFn: ({ signal }) => getEbayAspects(categoryId!, q, signal),
    enabled: !!categoryId,
    staleTime: 60 * 60 * 1000, // mirror server-side 1h cache
  })
