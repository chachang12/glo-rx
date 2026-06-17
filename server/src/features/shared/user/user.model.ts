import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { scopeBaseFields } from '../contributor/contributor-scope.js'

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
    // @deprecated examDate and dailyGoal duplicate per-plan settings whose
    // source of truth is the Plan document. Kept for backward compatibility
    // (removal needs a migration + shared-seam review); no longer writable via
    // PATCH /me. Read examDate/dailyGoal from the user's Plans instead.
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
      enum: ['user', 'contributor', 'admin'],
      default: 'user',
    },
    onboardingComplete: { type: Boolean, default: false },

    // ── Official Plan Program: contributor (SME reviewer) profile ────────
    // null for non-contributors. Populated on invite acceptance.
    contributor: {
      type: {
        scopes: {
          type: [
            new Schema(
              {
                ...scopeBaseFields,
                grantedAt: { type: Date, default: () => new Date() },
                grantedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
              },
              { _id: false }
            ),
          ],
          default: [],
        },
        dailyCap: { type: Number, default: 200, min: 0 },
        reliabilityScore: { type: Number, default: 1, min: 0, max: 1 },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        acceptedInviteId: { type: Schema.Types.ObjectId, ref: 'ContributorInvite', default: null },
      },
      default: null,
    },

    // ── Official Plan Program: per-exam access entitlement ───────────────
    // Source of truth for "can this user start a session for examCode?"
    // Stripe-sourced entries mirror subscription state; admin-grant and
    // contributor-courtesy entries are manually managed.
    examAccess: {
      type: [
        new Schema(
          {
            examCode: { type: String, required: true },
            source: {
              type: String,
              enum: ['stripe', 'admin-grant', 'contributor-courtesy'],
              required: true,
            },
            grantedAt: { type: Date, default: () => new Date() },
            expiresAt: { type: Date, default: null },
            stripeSubscriptionId: { type: String, default: null },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    // ── Telegram (Axeous Collect notifications) ─────────────────────────
    telegramChatId: { type: String, default: null, index: true, sparse: true },
    telegramUsername: { type: String, default: null },
    telegramLinkedAt: { type: Date, default: null },

    // ── Axeous Collect: advanced mode (faster polls + more watches) ─────
    advancedCollectMode: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

export type User = InferSchemaType<typeof userSchema>
export const UserModel = mongoose.model('User', userSchema)
