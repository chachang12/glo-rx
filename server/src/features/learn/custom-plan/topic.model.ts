import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const sourceExcerptSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'PlanDocument', required: true },
    chunkIndex: { type: Number, required: true },
    excerpt: { type: String, required: true },
  },
  { _id: false }
)

const generationStateSchema = new Schema(
  {
    lastGeneratedAt: { type: Date, default: null },
    generatedCount: { type: Number, default: 0 },
    inFlight: { type: Boolean, default: false },
    inFlightSince: { type: Date, default: null },
  },
  { _id: false }
)

const topicSchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    parentTopicId: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    mastery: { type: Number, default: 0, min: 0, max: 100 },
    sourceExcerpts: { type: [sourceExcerptSchema], default: [] },
    generationState: { type: generationStateSchema, default: () => ({}) },
  },
  { timestamps: true }
)

topicSchema.index({ planId: 1, label: 1 }, { unique: true })

export type Topic = InferSchemaType<typeof topicSchema>
export const TopicModel = mongoose.model('Topic', topicSchema)
