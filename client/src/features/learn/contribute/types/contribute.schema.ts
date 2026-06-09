import { z } from 'zod'

export const ContributorScopeSchema = z.object({
  examCode: z.string(),
  rateCents: z.number(),
  grantedAt: z.string().datetime({ offset: true }).optional(),
  grantedBy: z.string().nullable().optional(),
})
export type ContributorScope = z.infer<typeof ContributorScopeSchema>

export const ContributorMeSchema = z.object({
  role: z.enum(['user', 'contributor', 'admin']),
  firstName: z.string(),
  lastName: z.string(),
  scopes: z.array(ContributorScopeSchema),
  dailyCap: z.number(),
  reliabilityScore: z.number(),
  billableToday: z.number(),
  remainingToday: z.number(),
  minDwellMs: z.number(),
})
export type ContributorMe = z.infer<typeof ContributorMeSchema>

const QuestionOptionsSchema: z.ZodType<unknown> = z.union([
  z.record(z.string(), z.string()),
  z.array(z.string()),
])

export const QueueItemSchema = z.object({
  _id: z.string(),
  examCode: z.string(),
  type: z.string(),
  stem: z.string(),
  options: QuestionOptionsSchema,
  answer: z.array(z.string()),
  explanation: z.string().optional().default(''),
  topics: z.array(z.string()).optional().default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  status: z.string(),
  approvalCount: z.number().optional().default(0),
  rejectionCount: z.number().optional().default(0),
  corpusVersion: z.string().nullable().optional(),
  sourceCitations: z
    .array(
      z.object({
        documentId: z.string().nullable().optional(),
        fileHash: z.string().nullable().optional(),
        filePath: z.string().nullable().optional(),
        chunkIndex: z.number(),
        excerpt: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type QueueItem = z.infer<typeof QueueItemSchema>

export const QueueResponseSchema = z.object({
  items: z.array(QueueItemSchema),
  remaining: z.number(),
})
export type QueueResponse = z.infer<typeof QueueResponseSchema>

export const ReviewSubmissionSchema = z.object({
  eventId: z.string(),
  questionStatus: z.enum(['pending', 'approved', 'rejected']),
  billable: z.boolean(),
  notBillableReason: z
    .enum(['below-dwell', 'over-cap', 'duplicate'])
    .nullable(),
  capReached: z.boolean(),
  remainingToday: z.number(),
})
export type ReviewSubmission = z.infer<typeof ReviewSubmissionSchema>

export const EarningsPayoutSchema = z.object({
  _id: z.string(),
  periodStart: z.string().datetime({ offset: true }),
  periodEnd: z.string().datetime({ offset: true }),
  perExamBreakdown: z.array(
    z.object({
      examCode: z.string(),
      reviewCount: z.number(),
      rateCents: z.number(),
      amountCents: z.number(),
    })
  ),
  reviewCount: z.number(),
  amountCents: z.number(),
  status: z.enum(['pending', 'paid', 'reversed']),
  paidAt: z.string().datetime({ offset: true }).nullable(),
})
export type EarningsPayout = z.infer<typeof EarningsPayoutSchema>

export const EarningsSchema = z.object({
  pendingByExam: z.array(
    z.object({
      examCode: z.string(),
      pendingCount: z.number(),
      pendingCents: z.number(),
    })
  ),
  pendingTotalCents: z.number(),
  paidTotalCents: z.number(),
  payouts: z.array(EarningsPayoutSchema),
})
export type Earnings = z.infer<typeof EarningsSchema>

export const InviteDetailsSchema = z.object({
  email: z.string(),
  scopes: z.array(z.object({ examCode: z.string(), rateCents: z.number() })),
  dailyCap: z.number(),
  expiresAt: z.string().datetime({ offset: true }),
})
export type InviteDetails = z.infer<typeof InviteDetailsSchema>

export const AcceptInviteResponseSchema = z.object({
  ok: z.boolean(),
  role: z.enum(['user', 'contributor', 'admin']),
  scopes: z.array(ContributorScopeSchema),
})
export type AcceptInviteResponse = z.infer<typeof AcceptInviteResponseSchema>
