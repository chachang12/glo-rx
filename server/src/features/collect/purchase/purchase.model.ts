import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const priceSchema = new Schema(
  {
    value: { type: String, required: true },
    currency: { type: String, required: true },
  },
  { _id: false }
)

const purchaseSchema = new Schema(
  {
    authId: { type: String, required: true, index: true },
    authName: { type: String, required: true },
    authEmail: { type: String, required: true },
    watchId: { type: Schema.Types.ObjectId, default: null },
    watchName: { type: String, default: null },
    itemId: { type: String, required: true },
    item: { type: Schema.Types.Mixed, required: true },
    pricePaid: { type: priceSchema, required: true },
    purchasedAt: { type: Date, default: () => new Date() },
    notes: { type: String, default: null },
  },
  { timestamps: true }
)

// Common query patterns: per-day listing (admin), per-user history.
purchaseSchema.index({ purchasedAt: -1 })
purchaseSchema.index({ authId: 1, purchasedAt: -1 })
// One user can't double-mark the same item; different operators can.
purchaseSchema.index({ itemId: 1, authId: 1 }, { unique: true })

export type Purchase = InferSchemaType<typeof purchaseSchema>
export const PurchaseModel = mongoose.model('Purchase', purchaseSchema)
