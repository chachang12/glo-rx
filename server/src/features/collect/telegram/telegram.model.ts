import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const telegramLinkCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    authId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// Auto-prune expired codes immediately (Mongo respects the date in expiresAt).
telegramLinkCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type TelegramLinkCode = InferSchemaType<typeof telegramLinkCodeSchema>
export const TelegramLinkCodeModel = mongoose.model(
  'TelegramLinkCode',
  telegramLinkCodeSchema
)
