import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { PortalResponseSchema, type PortalResponse } from '../types/billing.schema'

export const createPortal = (): Promise<PortalResponse> =>
  apiClient.post('/api/billing/portal', PortalResponseSchema)

/** Opens the Stripe customer portal by redirecting the browser to it. */
export const useCreatePortal = () =>
  useMutation({
    mutationFn: createPortal,
    onSuccess: (data) => {
      window.location.href = data.url
    },
  })
