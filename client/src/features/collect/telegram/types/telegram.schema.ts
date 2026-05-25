import { z } from 'zod'

export const LinkResponseSchema = z.object({
  code: z.string(),
  expiresAt: z.string(),
  botStartUrl: z.string().nullable(),
})
export type LinkResponse = z.infer<typeof LinkResponseSchema>

export const UnlinkResponseSchema = z.object({
  unlinked: z.literal(true),
})
export type UnlinkResponse = z.infer<typeof UnlinkResponseSchema>
