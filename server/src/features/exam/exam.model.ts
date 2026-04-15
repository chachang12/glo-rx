import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// ── Shared question schema ──────────────────────────────────────────────────

const questionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['mcq', 'sata', 'ordered'],
      default: 'mcq',
    },
    stem: { type: String, required: true },
    options: { type: Schema.Types.Mixed, required: true }, // { "A": "...", "B": "..." } or string[]
    answer: { type: [String], required: true },
    explanation: { type: String, default: '' },
    topics: { type: [String], default: [] },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: null,
    },
    reportCount: { type: Number, default: 0 },
    reportedBy: { type: [String], default: [] },
  },
  { _id: true }
)

// ── Official Test ───────────────────────────────────────────────────────────

const officialTestSchema = new Schema(
  {
    examCode: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    timeLimit: { type: Number, default: null }, // minutes
    questions: { type: [questionSchema], required: true },
    questionCount: { type: Number, required: true },
  },
  { timestamps: true }
)

export type OfficialTest = InferSchemaType<typeof officialTestSchema>
export const OfficialTestModel = mongoose.model('OfficialTest', officialTestSchema)

// ── Question Bank ───────────────────────────────────────────────────────────

const questionBankItemSchema = new Schema(
  {
    examCode: { type: String, required: true, index: true },
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
    reportCount: { type: Number, default: 0 },
    reportedBy: { type: [String], default: [] },
  },
  { timestamps: true }
)

export type QuestionBankItem = InferSchemaType<typeof questionBankItemSchema>
export const QuestionBankModel = mongoose.model('QuestionBankItem', questionBankItemSchema)

// ── Exam ────────────────────────────────────────────────────────────────────

const examSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
    visibility: {
      type: String,
      enum: ['hidden', 'coming-soon', 'live'],
      default: 'hidden',
    },

    // ── Admin-managed content ────────────────────────────────────────────
    topics: [{ type: String }], // e.g. ["Pharmacology", "Cardiology", ...]
    aiReferenceText: { type: String, default: '' }, // markdown content for AI generation
    aiReferenceFileName: { type: String, default: null }, // original filename
  },
  { timestamps: true }
)

export type Exam = InferSchemaType<typeof examSchema>
export const ExamModel = mongoose.model('Exam', examSchema)

// ── Question Exposure Tracking ──────────────────────────────────────────────

const questionExposureSchema = new Schema(
  {
    authId: { type: String, required: true },
    questionId: { type: String, required: true },
    seenAt: { type: Date, default: () => new Date() },
    answered: { type: Boolean, default: false },
    correct: { type: Boolean, default: null },
  },
  { timestamps: true }
)

questionExposureSchema.index({ authId: 1, questionId: 1 })
questionExposureSchema.index({ authId: 1, seenAt: -1 })

export type QuestionExposure = InferSchemaType<typeof questionExposureSchema>
export const QuestionExposureModel = mongoose.model('QuestionExposure', questionExposureSchema)
