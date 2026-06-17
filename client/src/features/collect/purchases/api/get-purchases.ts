import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
import { PurchaseListSchema, type Purchase } from '../types/purchase.schema'
import { purchaseKeys } from './create-purchase'

export const getPurchasesByDate = (
  date: string,
  signal?: AbortSignal
): Promise<Purchase[]> => {
  const qs = new URLSearchParams({ date }).toString()
  return apiClient.get(`/api/collect/purchases?${qs}`, PurchaseListSchema, { signal })
}

export const useGetPurchasesByDate = (date: string | undefined) =>
  useResourceQuery({
    queryKey: date ? purchaseKeys.byDate(date) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getPurchasesByDate(date!, signal),
    enabled: !!date,
  })
