import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const topicSchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    label: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    mastery: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
)

topicSchema.index({ planId: 1, label: 1 }, { unique: true })

export type Topic = InferSchemaType<typeof topicSchema>
export const TopicModel = mongoose.model('Topic', topicSchema)
