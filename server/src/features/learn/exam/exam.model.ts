import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { QUESTION_TYPES, DEFAULT_ALLOWED_TYPES } from '../../../config/question-types.js'
import { questionBaseFields, questionReportFields } from '../../../config/question-schema.js'

// Re-export so existing importers of these constants from the exam model keep
// working; the canonical definitions live in config/question-types.ts.
export { QUESTION_TYPES, DEFAULT_ALLOWED_TYPES }

// ── Shared question schema ──────────────────────────────────────────────────

const questionSchema = new Schema(
  {
    ...questionBaseFields,
    ...questionReportFields,
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

// Union shape: legacy custom-plan citations use documentId; official corpus
// citations use fileHash + filePath. At least one anchoring set is required;
// validation lives in the generation pipeline, not the schema.
const sourceCitationSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'PlanDocument', default: null },
    fileHash: { type: String, default: null },
    filePath: { type: String, default: null },
    chunkIndex: { type: Number, required: true },
    excerpt: { type: String, default: '' },
  },
  { _id: false }
)

const questionVoteSchema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote: { type: String, enum: ['approve', 'reject'], required: true },
    comment: { type: String, default: null },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
)

const questionBankItemSchema = new Schema(
  {
    examCode: { type: String, required: true, index: true },
    ...questionBaseFields,
    ...questionReportFields,

    // ── Topic-anchored generation metadata ───────────────────────────────
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
    // authId of the user whose plan generated this question. Lets the creator
    // preview their own questions while they're still 'pending' review, before
    // consensus publishes them to all members of the exam.
    createdByAuthId: { type: String, default: null, index: true },
    generatedBy: {
      type: String,
      enum: ['ai', 'curator', 'user'],
      default: 'curator',
    },
    generatedAt: { type: Date, default: null },
    sourceCitations: { type: [sourceCitationSchema], default: [] },

    // ── Official Plan Program: review lifecycle ──────────────────────────
    // Default 'published' so backfilled legacy docs continue to serve.
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'published'],
      default: 'published',
      index: true,
    },
    corpusVersion: { type: String, default: null },
    votes: { type: [questionVoteSchema], default: [] },
    approvalCount: { type: Number, default: 0 },
    rejectionCount: { type: Number, default: 0 },
    rejectionReason: { type: String, default: null },
    releaseId: {
      type: Schema.Types.ObjectId,
      ref: 'Release',
      default: null,
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

questionBankItemSchema.index({ topicId: 1, generatedAt: -1 })
questionBankItemSchema.index({ examCode: 1, status: 1, createdAt: -1 })
questionBankItemSchema.index({ releaseId: 1 })

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
