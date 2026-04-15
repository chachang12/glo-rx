import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const questionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['mcq', 'sata', 'ordered'],
      default: 'mcq',
    },
    stem: { type: String, required: true },
    options: { type: Schema.Types.Mixed, required: true },
    answer: { type: [String], required: true },
    explanation: { type: String, default: '' },
    topics: { type: [String], default: [] },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: null,
    },
  },
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
