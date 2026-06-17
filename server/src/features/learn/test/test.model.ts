import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { questionBaseFields } from '../../../config/question-schema.js'

// Community tests embed the canonical question fields (no moderation counters —
// those live on the official bank / official tests only).
const questionSchema = new Schema(
  { ...questionBaseFields },
  { _id: true }
)

const testSchema = new Schema(
  {
    // ── Ownership ────────────────────────────────────────────────────────
    createdBy: {
      type: String,
      required: true,
      index: true,
    },

    // ── Exam link ────────────────────────────────────────────────────────
    examCode: {
      type: String,
      required: true,
      index: true,
    },

    // ── Metadata ─────────────────────────────────────────────────────────
    title: { type: String, required: true },
    description: { type: String, default: '' },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    sources: { type: [String], default: [] },
    questionCount: { type: Number, required: true },

    // ── Community ────────────────────────────────────────────────────────
    isPublic: { type: Boolean, default: true },
    timesPlayed: { type: Number, default: 0 },

    // ── Questions ────────────────────────────────────────────────────────
    questions: {
      type: [questionSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Full-text search on title and tags
testSchema.index({ title: 'text', tags: 'text' })

export type Test = InferSchemaType<typeof testSchema>
export const TestModel = mongoose.model('Test', testSchema)
