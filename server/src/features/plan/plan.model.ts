import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { isValidExamCode } from '../../config/exams.js'

const planSchema = new Schema(
  {
    authId: {
      type: String,
      required: true,
      index: true,
    },
    examCode: {
      type: String,
      required: true,
      validate: {
        validator: isValidExamCode,
        message: 'Invalid exam code',
      },
    },

    // ── Plan type ────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['standard', 'custom'],
      default: 'standard',
    },
    examName: { type: String, default: null }, // user-provided name for custom plans

    examDate: { type: Date, default: null },
    dailyGoal: { type: Number, default: null },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },

    // ── Document storage tracking ────────────────────────────────────────
    totalDocumentSize: { type: Number, default: 0 },

    // ── Sharing ──────────────────────────────────────────────────────────
    isPublished: { type: Boolean, default: false },
    shareCode: { type: String, unique: true, sparse: true },

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
