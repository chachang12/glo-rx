import { ApiError } from '@/lib/api/client'

/**
 * True when an error is a tier/quota rejection from the server (the standardized
 * `{ reason: 'tier_limit' }` shape on 402/429 responses). Lets UI swap a bare
 * error message for an "Upgrade to Pro" CTA.
 */
export function isTierLimitError(err: unknown): err is ApiError {
  return (
    err instanceof ApiError &&
    typeof err.body === 'object' &&
    err.body !== null &&
    (err.body as { reason?: unknown }).reason === 'tier_limit'
  )
}
