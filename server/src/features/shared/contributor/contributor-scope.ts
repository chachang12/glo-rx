import { Schema } from 'mongoose'

// Fields common to a contributor scope wherever it appears: on a pending
// invite and on an accepted contributor profile. Spread into each schema so
// the { examCode, rateCents } shape is defined exactly once.
export const scopeBaseFields = {
  examCode: { type: String, required: true },
  rateCents: { type: Number, required: true, min: 0 },
}

/** A pending-invite scope: just the base fields. */
export const inviteScopeSchema = new Schema({ ...scopeBaseFields }, { _id: false })
