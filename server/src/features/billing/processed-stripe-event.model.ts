import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const processedStripeEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    processedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

export type ProcessedStripeEvent = InferSchemaType<typeof processedStripeEventSchema>
export const ProcessedStripeEventModel = mongoose.model(
  'ProcessedStripeEvent',
  processedStripeEventSchema
)
