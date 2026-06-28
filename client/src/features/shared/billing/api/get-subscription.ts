import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { SubscriptionSchema, type Subscription } from '../types/billing.schema'

export const billingKeys = {
  subscription: () => ['billing', 'subscription'] as const,
  prices: () => ['billing', 'prices'] as const,
}

export const getSubscription = (signal?: AbortSignal): Promise<Subscription> =>
  apiClient.get('/api/billing/subscription', SubscriptionSchema, { signal })

export const useGetSubscription = () =>
  useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: ({ signal }) => getSubscription(signal),
  })
