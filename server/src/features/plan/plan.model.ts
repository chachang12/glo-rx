import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { EXAM_CODES } from '../../config/exams.js'

const planSchema = new Schema(
  {
    authId: {
      type: String,
      required: true,
      index: true,
    },
    examCode: {
      type: String,
      enum: EXAM_CODES,
      required: true,
    },
    examDate: { type: Date, default: null },
    dailyGoal: { type: Number, default: null },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },

    // ── Usage tracking ───────────────────────────────────────────────────
    tier: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    usageCount: { type: Number, default: 0 },
    usageResetAt: { type: Date, default: () => getNextReset() },
  },
  {
    timestamps: true,
  }
)

// A user can only have one plan per exam
planSchema.index({ authId: 1, examCode: 1 }, { unique: true })

function getNextReset(): Date {
  const now = new Date()
  const reset = new Date(now)
  reset.setUTCHours(24, 0, 0, 0) // midnight UTC tomorrow
  return reset
}

export type Plan = InferSchemaType<typeof planSchema>
export const PlanModel = mongoose.model('Plan', planSchema)
