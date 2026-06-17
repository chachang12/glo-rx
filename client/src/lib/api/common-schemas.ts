import { z } from 'zod'

/**
 * Canonical response shape for delete endpoints that echo the deleted id.
 * Import this instead of redefining a local `{ id, deleted: true }` schema.
 */
export const DeleteResponseSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>

/**
 * Canonical response shape for endpoints that just acknowledge success.
 */
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
})
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>
