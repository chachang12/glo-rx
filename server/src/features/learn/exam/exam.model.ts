import mongoose, { Schema, type InferSchemaType } from 'mongoose'

export const QUESTION_TYPES = [
  'mcq',
  'sata',
  'ordered',
  'calculation',
  'exhibit',
  'priority',
  'fib',
] as const
export const DEFAULT_ALLOWED_TYPES: readonly (typeof QUESTION_TYPES)[number][] = ['mcq']

// ── Shared question schema ──────────────────────────────────────────────────

const questionSchema = new Schema(
  {
    type: {
      type: String,
      enum: QUESTION_TYPES,
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

const sourceCitationSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'PlanDocument', required: true },
    chunkIndex: { type: Number, required: true },
  },
  { _id: false }
)

const questionBankItemSchema = new Schema(
  {
    examCode: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: QUESTION_TYPES,
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

    // ── Topic-anchored generation metadata ───────────────────────────────
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
    generatedBy: {
      type: String,
      enum: ['ai', 'curator', 'user'],
      default: 'curator',
    },
    generatedAt: { type: Date, default: null },
    sourceCitations: { type: [sourceCitationSchema], default: [] },
  },
  { timestamps: true }
)

questionBankItemSchema.index({ topicId: 1, generatedAt: -1 })

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
    // At most one exam is featured at a time — enforced server-side in the
    // admin PATCH handler. Drives the Marketplace "Featured exam" hero card.
    featured: { type: Boolean, default: false, index: true },

    // ── Admin-managed content ────────────────────────────────────────────
    topics: [{ type: String }], // e.g. ["Pharmacology", "Cardiology", ...]
    aiReferenceText: { type: String, default: '' }, // markdown content for AI generation
    aiReferenceFileName: { type: String, default: null }, // original filename
    allowedQuestionTypes: {
      type: [String],
      enum: QUESTION_TYPES,
      default: () => [...DEFAULT_ALLOWED_TYPES],
    },
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
