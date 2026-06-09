import { QuestionBankModel } from '../../learn/exam/exam.model.js'
import { ReviewEventModel } from './review-event.model.js'
import { UserModel } from '../user/user.model.js'

export type VoteKind = 'approve' | 'reject'

export type SubmitReviewInput = {
  reviewerAuthId: string
  questionId: string
  vote: VoteKind
  comment: string | null
  dwellMs: number
}

export type SubmitReviewResult = {
  eventId: string
  questionStatus: 'pending' | 'approved' | 'rejected'
  billable: boolean
  notBillableReason: 'below-dwell' | 'over-cap' | 'duplicate' | null
  capReached: boolean
  remainingToday: number
}

// 5s minimum dwell — below this we record the vote for audit but mark it
// non-billable. Tuned so a thoughtful reviewer always clears it.
export const MIN_DWELL_MS = 5_000

// 2 approve = approved, 2 reject = rejected. Single-vote states stay pending.
const APPROVAL_THRESHOLD = 2
const REJECTION_THRESHOLD = 2

/**
 * Submit a vote on a pending question. Idempotent at the (reviewer, question)
 * level via the unique index — duplicate votes return the original event with
 * billable:false and notBillableReason:'duplicate'.
 */
export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  const reviewer = await UserModel.findOne({ authId: input.reviewerAuthId })
    .select('_id role contributor')
    .lean()
  if (!reviewer) throw new ReviewError('Reviewer not found', 404)

  const question = await QuestionBankModel.findById(input.questionId)
  if (!question) throw new ReviewError('Question not found', 404)
  if (question.status !== 'pending') {
    throw new ReviewError(`Question is ${question.status}, not pending`, 409)
  }

  const examCode = question.examCode
  const scope = reviewer.contributor?.scopes?.find((s) => s.examCode === examCode) ?? null
  const isAdmin = reviewer.role === 'admin'

  if (!isAdmin && !scope) {
    throw new ReviewError(`Reviewer not authorized for exam ${examCode}`, 403)
  }

  if (input.vote === 'reject' && !(input.comment ?? '').trim()) {
    throw new ReviewError('A comment is required when rejecting', 400)
  }

  const rateCents = scope?.rateCents ?? 0
  const dailyCap = reviewer.contributor?.dailyCap ?? 0

  // Daily cap measured by billable events in the last 24h sliding window — keep
  // it simple and reviewer-local rather than per-calendar-day.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const billableToday = await ReviewEventModel.countDocuments({
    reviewerId: reviewer._id,
    billable: true,
    at: { $gte: since },
  })

  let billable = !isAdmin
  let notBillableReason: SubmitReviewResult['notBillableReason'] = null
  let capReached = false

  if (input.dwellMs < MIN_DWELL_MS) {
    billable = false
    notBillableReason = 'below-dwell'
  } else if (!isAdmin && dailyCap > 0 && billableToday >= dailyCap) {
    billable = false
    notBillableReason = 'over-cap'
    capReached = true
  }

  let event
  try {
    event = await ReviewEventModel.create({
      reviewerId: reviewer._id,
      questionId: question._id,
      examCode,
      vote: input.vote,
      comment: input.comment ?? null,
      dwellMs: input.dwellMs,
      rateCents,
      billable,
      notBillableReason,
      at: new Date(),
    })
  } catch (err: unknown) {
    // Unique index (reviewerId, questionId) — duplicate vote.
    if (isDuplicateKeyError(err)) {
      const existing = await ReviewEventModel.findOne({
        reviewerId: reviewer._id,
        questionId: question._id,
      }).lean()
      return {
        eventId: existing ? String(existing._id) : '',
        questionStatus: question.status as 'pending' | 'approved' | 'rejected',
        billable: false,
        notBillableReason: 'duplicate',
        capReached: false,
        remainingToday: Math.max(0, dailyCap - billableToday),
      }
    }
    throw err
  }

  // Append the vote to the question's audit trail and re-tally.
  question.votes.push({
    reviewerId: reviewer._id,
    vote: input.vote,
    comment: input.comment ?? null,
    at: new Date(),
  })
  if (input.vote === 'approve') question.approvalCount += 1
  if (input.vote === 'reject') question.rejectionCount += 1

  let questionStatus: 'pending' | 'approved' | 'rejected' = 'pending'
  if (question.approvalCount >= APPROVAL_THRESHOLD) {
    question.status = 'approved'
    questionStatus = 'approved'
  } else if (question.rejectionCount >= REJECTION_THRESHOLD) {
    question.status = 'rejected'
    questionStatus = 'rejected'
    if (!question.rejectionReason) {
      question.rejectionReason = (input.comment ?? '').trim() || 'Rejected by review consensus'
    }
  }

  await question.save()

  const remainingToday = Math.max(0, dailyCap - (billableToday + (billable ? 1 : 0)))

  return {
    eventId: String(event._id),
    questionStatus,
    billable,
    notBillableReason,
    capReached,
    remainingToday,
  }
}

export class ReviewError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ReviewError'
    this.status = status
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  )
}
