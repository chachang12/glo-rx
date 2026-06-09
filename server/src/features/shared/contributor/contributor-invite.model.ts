import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const inviteScopeSchema = new Schema(
  {
    examCode: { type: String, required: true },
    rateCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const contributorInviteSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    scopes: { type: [inviteScopeSchema], default: [] },
    dailyCap: { type: Number, default: 200, min: 0 },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export type ContributorInvite = InferSchemaType<typeof contributorInviteSchema>
export const ContributorInviteModel = mongoose.model('ContributorInvite', contributorInviteSchema)
