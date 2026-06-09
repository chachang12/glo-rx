import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const adminAuditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    // Free-form target descriptor: e.g. { kind: 'release', id: '...' } or
    // { kind: 'user', authId: '...' }. Indexed via the kind subfield so we
    // can pull "all release actions" without a collection scan.
    target: { type: Schema.Types.Mixed, default: null },
    // Snapshot of the payload that drove the action, for forensic replay.
    payload: { type: Schema.Types.Mixed, default: null },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
)

adminAuditLogSchema.index({ actorUserId: 1, at: -1 })
adminAuditLogSchema.index({ action: 1, at: -1 })

export type AdminAuditLog = InferSchemaType<typeof adminAuditLogSchema>
export const AdminAuditLogModel = mongoose.model('AdminAuditLog', adminAuditLogSchema)
