import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const planDocumentSchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'pptx'],
      required: true,
    },
    fileSize: { type: Number, required: true },
    parsedText: { type: String, required: true },
    charCount: { type: Number, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

export type PlanDocument = InferSchemaType<typeof planDocumentSchema>
export const PlanDocumentModel = mongoose.model('PlanDocument', planDocumentSchema)
