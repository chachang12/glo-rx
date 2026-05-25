import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
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
  useQuery({
    queryKey: date ? purchaseKeys.byDate(date) : ['collect', 'purchases', '__idle__'],
    queryFn: ({ signal }) => getPurchasesByDate(date!, signal),
    enabled: !!date,
  })
