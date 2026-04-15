import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const roadmapDaySchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    dayNumber: { type: Number, required: true },
    date: { type: Date, required: true },
    phase: {
      type: String,
      enum: ['learn', 'review', 'simulate'],
      required: true,
    },
    activityType: {
      type: String,
      enum: ['flashcard', 'daily-quiz', 'topic-quiz', 'subset-test', 'composite-test'],
      required: true,
    },
    topicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    label: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
)

roadmapDaySchema.index({ planId: 1, dayNumber: 1 }, { unique: true })

export type RoadmapDay = InferSchemaType<typeof roadmapDaySchema>
export const RoadmapDayModel = mongoose.model('RoadmapDay', roadmapDaySchema)
