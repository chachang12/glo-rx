import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { EXAM_CODES } from '../../config/exams.js'

const userSchema = new Schema(
  {
    // Links to Better Auth's user.id
    authId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ── Profile ──────────────────────────────────────────────────────────
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    displayName: { type: String, default: '' },

    // ── Exam Context ─────────────────────────────────────────────────────
    activeExam: {
      type: String,
      enum: EXAM_CODES,
      default: null,
    },
    exams: {
      type: [{ type: String, enum: EXAM_CODES }],
      default: [],
    },
    examDate: { type: Date, default: null },

    // ── Preferences ──────────────────────────────────────────────────────
    dailyGoal: { type: Number, default: null },
    defaultSessionLength: { type: Number, default: 10 },

    // ── Account ──────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    onboardingComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

export type User = InferSchemaType<typeof userSchema>
export const UserModel = mongoose.model('User', userSchema)
