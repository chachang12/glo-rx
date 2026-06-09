import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const reviewEventSchema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'QuestionBankItem', required: true },
    examCode: { type: String, required: true },
    vote: { type: String, enum: ['approve', 'reject'], required: true },
    comment: { type: String, default: null },
    dwellMs: { type: Number, required: true, min: 0 },
    rateCents: { type: Number, required: true, min: 0 },
    billable: { type: Boolean, required: true },
    notBillableReason: {
      type: String,
      enum: ['below-dwell', 'over-cap', 'duplicate', 'admin-flagged', null],
      default: null,
    },
    adminFlaggedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    adminFlaggedAt: { type: Date, default: null },
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

// One billable event per (reviewer, question). Revision events insert
// fresh rows with billable:false + notBillableReason:'duplicate'.
reviewEventSchema.index({ reviewerId: 1, questionId: 1 }, { unique: true })
reviewEventSchema.index({ reviewerId: 1, at: -1 })
reviewEventSchema.index({ examCode: 1, at: -1 })

export type ReviewEvent = InferSchemaType<typeof reviewEventSchema>
export const ReviewEventModel = mongoose.model('ReviewEvent', reviewEventSchema)
