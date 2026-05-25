import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const SEEN_ID_CAP = 2000

// Mirrors SearchFilters from ebay.types.ts. Stored loosely as Mixed since
// the schema is flat and validation happens at the route layer.
const filtersSchema = new Schema(
  {
    q: { type: String, default: undefined },
    categoryId: { type: String, default: undefined },
    priceMin: { type: Number, default: undefined },
    priceMax: { type: Number, default: undefined },
    priceCurrency: { type: String, default: undefined },
    conditions: { type: [String], default: undefined },
    conditionIds: { type: [String], default: undefined },
    buyingOptions: { type: [String], default: undefined },
    sellers: { type: [String], default: undefined },
    excludeSellers: { type: [String], default: undefined },
    itemLocationCountry: { type: String, default: undefined },
    maxDeliveryCost: { type: Number, default: undefined },
    returnsAccepted: { type: Boolean, default: undefined },
    searchInDescription: { type: Boolean, default: undefined },
    aspects: { type: Schema.Types.Mixed, default: undefined },
    sort: { type: String, default: undefined },
    limit: { type: Number, default: undefined },
    offset: { type: Number, default: undefined },
  },
  { _id: false }
)

const watchSchema = new Schema(
  {
    authId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    filters: { type: filtersSchema, required: true },
    notifyMode: {
      type: String,
      enum: ['sse_only', 'telegram_only', 'both'],
      default: 'both',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'rate_limited', 'error'],
      default: 'active',
    },
    startedAt: { type: Date, default: () => new Date() },
    lastPolledAt: { type: Date, default: null },
    nextPollAt: { type: Date, default: () => new Date() },
    seenItemIds: { type: [String], default: [] },
    matchCount: { type: Number, default: 0 },
    pollCount: { type: Number, default: 0 },
    lastError: {
      type: {
        message: { type: String, required: true },
        status: { type: Number, default: null },
        at: { type: Date, required: true },
      },
      default: null,
    },
  },
  { timestamps: true }
)

watchSchema.index({ status: 1, nextPollAt: 1 })

// Bound seenItemIds so docs don't grow unbounded over weeks of polling.
watchSchema.pre('save', function (next) {
  if (this.seenItemIds && this.seenItemIds.length > SEEN_ID_CAP) {
    this.seenItemIds = this.seenItemIds.slice(-SEEN_ID_CAP)
  }
  next()
})

export type Watch = InferSchemaType<typeof watchSchema>
export const WatchModel = mongoose.model('Watch', watchSchema)

// ── WatchMatch ────────────────────────────────────────────────────────────

const matchRetentionDays = Number(process.env.MATCH_RETENTION_DAYS) || 30

const watchMatchSchema = new Schema(
  {
    watchId: { type: Schema.Types.ObjectId, ref: 'Watch', required: true, index: true },
    authId: { type: String, required: true, index: true },
    item: { type: Schema.Types.Mixed, required: true },
    matchedAt: { type: Date, default: () => new Date(), index: true },
    notified: {
      type: {
        sse: { type: Boolean, default: false },
        telegram: { type: Boolean, default: false },
      },
      default: { sse: false, telegram: false },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// TTL: Mongo auto-deletes matches older than retention window.
watchMatchSchema.index(
  { matchedAt: 1 },
  { expireAfterSeconds: matchRetentionDays * 86400 }
)

export type WatchMatch = InferSchemaType<typeof watchMatchSchema>
export const WatchMatchModel = mongoose.model('WatchMatch', watchMatchSchema)
