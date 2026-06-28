import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  CheckoutResponseSchema,
  type CheckoutResponse,
  type Cadence,
} from '../types/billing.schema'

export const createCheckout = (cadence: Cadence): Promise<CheckoutResponse> =>
  apiClient.post('/api/billing/checkout', CheckoutResponseSchema, { body: { cadence } })

/** Starts Checkout and redirects the browser to the hosted Stripe page. */
export const useCreateCheckout = () =>
  useMutation({
    mutationFn: createCheckout,
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
    },
  })
