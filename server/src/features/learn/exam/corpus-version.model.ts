import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const corpusFileSchema = new Schema(
  {
    path: { type: String, required: true },
    role: {
      type: String,
      enum: ['reference', 'official-test'],
      required: true,
    },
    fileHash: { type: String, required: true },
    chunkCount: { type: Number, default: 0 },
  },
  { _id: false }
)

const corpusVersionSchema = new Schema(
  {
    examCode: { type: String, required: true, index: true },
    version: { type: String, required: true },
    files: { type: [corpusFileSchema], default: [] },
    loadedAt: { type: Date, default: () => new Date() },
    loadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

corpusVersionSchema.index({ examCode: 1, version: 1 }, { unique: true })

export type CorpusVersion = InferSchemaType<typeof corpusVersionSchema>
export const CorpusVersionModel = mongoose.model('CorpusVersion', corpusVersionSchema)
