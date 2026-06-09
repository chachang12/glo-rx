import { z } from 'zod'

// ── App user (from /api/user/me) ──────────────────────────────────────────
export const AppUserSchema = z.object({
  _id: z.string(),
  authId: z.string(),
  username: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().optional().default(''),
  activeExam: z.string().nullable().optional(),
  exams: z.array(z.string()).default([]),
  examDate: z.string().datetime({ offset: true }).nullable().optional(),
  dailyGoal: z.number().nullable().optional(),
  defaultSessionLength: z.number().optional(),
  licenses: z
    .object({
      aiGeneration: z.boolean(),
      customPlans: z.boolean(),
    })
    .optional(),
  role: z.enum(['user', 'contributor', 'admin']).default('user'),
  onboardingComplete: z.boolean().default(false),
  telegramChatId: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
  telegramLinkedAt: z.string().datetime({ offset: true }).nullable().optional(),
  advancedCollectMode: z.boolean().optional().default(false),
  contributor: z
    .object({
      scopes: z.array(
        z.object({
          examCode: z.string(),
          rateCents: z.number(),
          grantedAt: z.string().datetime({ offset: true }).optional(),
          grantedBy: z.string().nullable().optional(),
        })
      ),
      dailyCap: z.number(),
      reliabilityScore: z.number(),
      invitedBy: z.string().nullable().optional(),
      acceptedInviteId: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  examAccess: z
    .array(
      z.object({
        examCode: z.string(),
        source: z.enum(['stripe', 'admin-grant', 'contributor-courtesy']),
        grantedAt: z.string().datetime({ offset: true }).optional(),
        expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
        stripeSubscriptionId: z.string().nullable().optional(),
      })
    )
    .optional()
    .default([]),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})
export type AppUser = z.infer<typeof AppUserSchema>

// ── User stats (from /api/user/me/stats) ──────────────────────────────────
export const UserStatsSchema = z.object({
  totalQuestions: z.number(),
  accuracy: z.number().nullable(),
  streak: z.number(),
  daysToExam: z.number().nullable(),
  nextExamLabel: z.string().nullable(),
  masteredCount: z.number(),
  totalTopics: z.number(),
})
export type UserStats = z.infer<typeof UserStatsSchema>

// ── Leaderboard entry (from /api/user/leaderboard) ────────────────────────
export const LeaderboardEntrySchema = z.object({
  authId: z.string(),
  username: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  isMe: z.boolean(),
  streak: z.number(),
  totalQuestions: z.number(),
  accuracy: z.number().nullable().optional(),
})
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>

// ── User search result (from /api/user/search) ────────────────────────────
export const UserSearchResultSchema = z.object({
  authId: z.string(),
  username: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
})
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>

// ── Profile update payload ────────────────────────────────────────────────
export const UpdateProfileInputSchema = z.object({
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  activeExam: z.string().nullable().optional(),
  exams: z.array(z.string()).optional(),
  examDate: z.string().nullable().optional(),
  dailyGoal: z.number().nullable().optional(),
  defaultSessionLength: z.number().optional(),
  onboardingComplete: z.boolean().optional(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>
