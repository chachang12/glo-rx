import mongoose, { Schema, type InferSchemaType } from 'mongoose'

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
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_]{3,20}$/,
      default: null,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    displayName: { type: String, default: '' },

    // ── Exam Context ─────────────────────────────────────────────────────
    activeExam: {
      type: String,
      default: null,
    },
    exams: {
      type: [{ type: String }],
      default: [],
    },
    examDate: { type: Date, default: null },

    // ── Preferences ──────────────────────────────────────────────────────
    dailyGoal: { type: Number, default: null },
    defaultSessionLength: { type: Number, default: 10 },

    // ── Licenses ─────────────────────────────────────────────────────────
    licenses: {
      type: {
        aiGeneration: { type: Boolean, default: false },
        customPlans: { type: Boolean, default: false },
      },
      default: { aiGeneration: false, customPlans: false },
    },

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
