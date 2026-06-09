import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const documentChunkSchema = new Schema(
  {
    index: { type: Number, required: true },
    text: { type: String, required: true },
    charStart: { type: Number, required: true },
    charEnd: { type: Number, required: true },
  },
  { _id: false }
)

const planDocumentSchema = new Schema(
  {
    // null for official corpus documents (they belong to an exam, not a plan).
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
      index: true,
    },
    fileName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'pptx', 'md'],
      required: true,
    },
    fileSize: { type: Number, required: true },
    parsedText: { type: String, required: true },
    charCount: { type: Number, required: true },
    chunks: { type: [documentChunkSchema], default: [] },
    uploadedAt: { type: Date, default: () => new Date() },

    // ── Official Plan Program: corpus binding ────────────────────────────
    // 'custom' = user-uploaded for their custom plan (existing behavior).
    // 'official' = repo-loaded reference material for an official exam plan.
    corpusSource: {
      type: String,
      enum: ['custom', 'official'],
      default: 'custom',
      index: true,
    },
    examCode: { type: String, default: null, index: true },
    corpusVersion: { type: String, default: null },
    fileHash: { type: String, default: null },
    filePath: { type: String, default: null },
    role: {
      type: String,
      enum: ['source', 'reference', 'official-test'],
      default: 'source',
    },
  },
  { timestamps: true }
)

// Unique anchoring for official corpus docs (one row per (exam, version, file)).
planDocumentSchema.index(
  { examCode: 1, corpusVersion: 1, fileHash: 1 },
  {
    unique: true,
    partialFilterExpression: { corpusSource: 'official' },
  }
)

export type PlanDocument = InferSchemaType<typeof planDocumentSchema>
export const PlanDocumentModel = mongoose.model('PlanDocument', planDocumentSchema)
