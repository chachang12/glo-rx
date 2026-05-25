import { z } from 'zod'
import { CompactItemSchema, type CompactItem } from '@/features/collect/ebay/types/ebay.schema'

export const PurchaseSchema = z.object({
  id: z.string(),
  authId: z.string(),
  authName: z.string(),
  authEmail: z.string(),
  watchId: z.string().nullable(),
  watchName: z.string().nullable(),
  itemId: z.string(),
  item: CompactItemSchema,
  pricePaid: z.object({ value: z.string(), currency: z.string() }),
  purchasedAt: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string().nullable(),
})

export type Purchase = z.infer<typeof PurchaseSchema>
export const PurchaseListSchema = z.array(PurchaseSchema)

export interface CreatePurchaseInput {
  item: CompactItem
  watchId?: string
  watchName?: string
}
