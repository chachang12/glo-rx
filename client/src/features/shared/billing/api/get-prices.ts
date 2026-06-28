import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { PricesResponseSchema, type PricesResponse } from '../types/billing.schema'
import { billingKeys } from './get-subscription'

export const getPrices = (signal?: AbortSignal): Promise<PricesResponse> =>
  apiClient.get('/api/billing/prices', PricesResponseSchema, { signal })

export const useGetPrices = () =>
  useQuery({
    queryKey: billingKeys.prices(),
    queryFn: ({ signal }) => getPrices(signal),
  })
