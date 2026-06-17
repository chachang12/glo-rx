import { z } from 'zod'
import { CompactItemSchema, type SearchFilters } from '@/features/collect/ebay/types/ebay.schema'

// Re-exported from the shared API schema module so existing imports of
// `DeleteResponseSchema` from this feature keep working.
export { DeleteResponseSchema } from '@/lib/api/common-schemas'

export const NotifyModeSchema = z.enum(['sse_only', 'telegram_only', 'both'])
export type NotifyMode = z.infer<typeof NotifyModeSchema>

export const WatchStatusSchema = z.enum(['active', 'paused', 'rate_limited', 'error'])
export type WatchStatus = z.infer<typeof WatchStatusSchema>

// Loose passthrough — server validates the canonical shape. Cast on read where needed.
export const WatchFiltersSchema = z
  .object({
    q: z.string().optional(),
    categoryId: z.string().optional(),
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    priceCurrency: z.string().optional(),
    conditions: z.array(z.string()).optional(),
    conditionIds: z.array(z.string()).optional(),
    buyingOptions: z.array(z.string()).optional(),
    sellers: z.array(z.string()).optional(),
    excludeSellers: z.array(z.string()).optional(),
    itemLocationCountry: z.string().optional(),
    maxDeliveryCost: z.number().optional(),
    returnsAccepted: z.boolean().optional(),
    searchInDescription: z.boolean().optional(),
    aspects: z.record(z.string(), z.array(z.string())).optional(),
    sort: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  })
  .passthrough()

export const WatchSchema = z.object({
  id: z.string(),
  authId: z.string(),
  name: z.string(),
  filters: WatchFiltersSchema,
  notifyMode: NotifyModeSchema,
  status: WatchStatusSchema,
  startedAt: z.string(),
  lastPolledAt: z.string().nullable(),
  nextPollAt: z.string().nullable(),
  matchCount: z.number(),
  pollCount: z.number().default(0),
  lastError: z
    .object({
      message: z.string(),
      status: z.number().nullable(),
      at: z.string(),
    })
    .nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
})

export type Watch = z.infer<typeof WatchSchema>
export const WatchListSchema = z.array(WatchSchema)

export const WatchMatchSchema = z.object({
  id: z.string(),
  watchId: z.string(),
  item: CompactItemSchema,
  matchedAt: z.string(),
  notified: z.object({ sse: z.boolean(), telegram: z.boolean() }),
})

export type WatchMatch = z.infer<typeof WatchMatchSchema>
export const WatchMatchListSchema = z.array(WatchMatchSchema)

export interface CreateWatchInput {
  name?: string
  filters: SearchFilters
  notifyMode?: NotifyMode
}

export interface UpdateWatchInput {
  name?: string
  notifyMode?: NotifyMode
  status?: WatchStatus
}
