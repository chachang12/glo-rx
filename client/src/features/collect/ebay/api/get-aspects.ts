import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
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
  useResourceQuery({
    queryKey: categoryId ? ebayKeys.aspects(categoryId, q) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getEbayAspects(categoryId!, q, signal),
    enabled: !!categoryId,
    staleTime: 60 * 60 * 1000, // mirror server-side 1h cache
  })
