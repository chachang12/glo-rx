import mongoose, { Schema, type InferSchemaType } from 'mongoose'

/**
 * Per-day per-scope counter for eBay API usage. Daily counts survive
 * server restarts so the dashboard quota gauge doesn't reset every deploy.
 * Keyed by UTC date (eBay quota resets at UTC midnight).
 */
const RATE_COUNTER_TTL_DAYS = 90

const rateCounterSchema = new Schema(
  {
    dateKey: { type: String, required: true }, // YYYY-MM-DD UTC
    scope: { type: String, required: true, default: 'browse' },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

rateCounterSchema.index({ dateKey: 1, scope: 1 }, { unique: true })
// Auto-prune counter docs after RATE_COUNTER_TTL_DAYS. We only need recent
// history for the dashboard; older days have no functional use.
rateCounterSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: RATE_COUNTER_TTL_DAYS * 86400 }
)

export type RateCounter = InferSchemaType<typeof rateCounterSchema>
export const RateCounterModel = mongoose.model('RateCounter', rateCounterSchema)

export function todayUtcKey(): string {
  return new Date().toISOString().slice(0, 10)
}
