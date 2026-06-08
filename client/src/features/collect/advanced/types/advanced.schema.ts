import { z } from 'zod'

export const RedeemAdvancedKeyResponseSchema = z.object({
  advancedCollectMode: z.literal(true),
})
export type RedeemAdvancedKeyResponse = z.infer<typeof RedeemAdvancedKeyResponseSchema>

export type RedeemAdvancedKeyInput = { key: string }
