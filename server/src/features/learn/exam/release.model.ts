import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const releaseSchema = new Schema(
  {
    examCode: { type: String, required: true, index: true },
    version: { type: String, required: true },
    name: { type: String, required: true },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'live', 'archived'],
      default: 'draft',
      index: true,
    },
    questionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'QuestionBankItem',
      default: [],
    },
    corpusVersion: { type: String, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

releaseSchema.index({ examCode: 1, version: 1 }, { unique: true })
releaseSchema.index({ examCode: 1, status: 1 })

export type Release = InferSchemaType<typeof releaseSchema>
export const ReleaseModel = mongoose.model('Release', releaseSchema)
