import { z } from 'zod'

export const CadenceSchema = z.enum(['monthly', 'annual', 'lifetime'])
export type Cadence = z.infer<typeof CadenceSchema>

export const TierSchema = z.enum(['free', 'pro'])
export type Tier = z.infer<typeof TierSchema>

export const CapabilitiesSchema = z.object({
  dailyAiCalls: z.number(),
  maxCustomPlans: z.number(),
  maxFilesPerPlan: z.number(),
  canGenerateTests: z.boolean(),
})
export type Capabilities = z.infer<typeof CapabilitiesSchema>

export const SubscriptionSchema = z.object({
  tier: TierSchema,
  status: z.enum(['none', 'active', 'past_due', 'canceled']),
  cadence: CadenceSchema.nullable(),
  currentPeriodEnd: z.string().datetime({ offset: true }).nullable(),
  cancelAtPeriodEnd: z.boolean(),
  capabilities: CapabilitiesSchema,
  tiers: z.object({ free: CapabilitiesSchema, pro: CapabilitiesSchema }),
})
export type Subscription = z.infer<typeof SubscriptionSchema>

export const CheckoutResponseSchema = z.object({ url: z.string().url().nullable() })
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>

export const PortalResponseSchema = z.object({ url: z.string().url() })
export type PortalResponse = z.infer<typeof PortalResponseSchema>

export const PriceSchema = z.object({
  cadence: CadenceSchema,
  amount: z.number().nullable(), // smallest currency unit (e.g. cents)
  currency: z.string().nullable(),
  interval: z.string().nullable(), // 'month' | 'year' | null (one-time)
})
export type Price = z.infer<typeof PriceSchema>

export const PricesResponseSchema = z.object({ prices: z.array(PriceSchema) })
export type PricesResponse = z.infer<typeof PricesResponseSchema>
