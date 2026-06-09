import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const perExamBreakdownSchema = new Schema(
  {
    examCode: { type: String, required: true },
    reviewCount: { type: Number, required: true, min: 0 },
    rateCents: { type: Number, required: true, min: 0 },
    amountCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const contributorPayoutSchema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    perExamBreakdown: { type: [perExamBreakdownSchema], default: [] },
    reviewCount: { type: Number, required: true, min: 0 },
    amountCents: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'reversed'],
      default: 'pending',
      index: true,
    },
    paidAt: { type: Date, default: null },
    externalRef: { type: String, default: null },
    notes: { type: String, default: null },
    generatedAt: { type: Date, default: () => new Date() },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

contributorPayoutSchema.index({ reviewerId: 1, periodStart: 1 }, { unique: true })

export type ContributorPayout = InferSchemaType<typeof contributorPayoutSchema>
export const ContributorPayoutModel = mongoose.model('ContributorPayout', contributorPayoutSchema)
