import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { EXAM_CODES } from '../../config/exams.js'

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    selected: { type: [String], required: true },
    correct: { type: Boolean, required: true },
    timeMs: { type: Number, default: null },
  },
  { _id: false }
)

const sessionSchema = new Schema(
  {
    authId: {
      type: String,
      required: true,
      index: true,
    },
    examCode: {
      type: String,
      enum: EXAM_CODES,
      required: true,
    },
    answers: {
      type: [answerSchema],
      required: true,
    },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    durationMs: { type: Number, default: null },
    completedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
  }
)

export type Session = InferSchemaType<typeof sessionSchema>
export const SessionModel = mongoose.model('Session', sessionSchema)
