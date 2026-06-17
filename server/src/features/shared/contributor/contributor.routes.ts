import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import { requireContributor } from '../../../middleware/contributor.js'
import type { AuthEnv } from '../../../types.js'
import { UserModel } from '../user/user.model.js'
import { QuestionBankModel } from '../../learn/exam/exam.model.js'
import { ReviewEventModel } from './review-event.model.js'
import { ContributorPayoutModel } from './contributor-payout.model.js'
import { submitReview, ReviewError, MIN_DWELL_MS } from './review-event.service.js'

const contributorRoutes = new Hono<AuthEnv>()

contributorRoutes.use(requireAuth)
contributorRoutes.use(requireContributor())

// GET /api/contributor/me — contributor profile + today's billable count.
contributorRoutes.get('/me', async (c) => {
  const authUser = c.get('user')
  const user = await UserModel.findOne({ authId: authUser.id })
    .select('_id firstName lastName role contributor')
    .lean()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const billableToday = await ReviewEventModel.countDocuments({
    reviewerId: user._id,
    billable: true,
    at: { $gte: since },
  })

  const dailyCap = user.contributor?.dailyCap ?? 0

  return c.json({
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    scopes: user.contributor?.scopes ?? [],
    dailyCap,
    reliabilityScore: user.contributor?.reliabilityScore ?? 1,
    billableToday,
    remainingToday: Math.max(0, dailyCap - billableToday),
    minDwellMs: MIN_DWELL_MS,
  })
})

// GET /api/contributor/queue?examCode=...&limit=... — next pending questions
// for review, scoped to the contributor's exams. Excludes anything the
// reviewer already voted on.
contributorRoutes.get('/queue', async (c) => {
  const authUser = c.get('user')
  const examCodeQuery = c.req.query('examCode')
  const limit = Math.max(1, Math.min(20, Number.parseInt(c.req.query('limit') ?? '5', 10) || 5))

  const user = await UserModel.findOne({ authId: authUser.id })
    .select('_id role contributor')
    .lean()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const allowedExams =
    user.role === 'admin'
      ? null // admin sees everything
      : (user.contributor?.scopes ?? []).map((s) => s.examCode)

  if (allowedExams && allowedExams.length === 0) {
    return c.json({ items: [], remaining: 0 })
  }
  if (examCodeQuery && allowedExams && !allowedExams.includes(examCodeQuery)) {
    return c.json({ error: `Not authorized for exam ${examCodeQuery}` }, 403)
  }

  const examFilter = examCodeQuery
    ? { examCode: examCodeQuery }
    : allowedExams
      ? { examCode: { $in: allowedExams } }
      : {}

  // Exclude already-voted questions via a sub-fetch — Mongo doesn't support
  // joined NOT-EXISTS cheaply, but the result set is small.
  const votedIds = await ReviewEventModel.find({ reviewerId: user._id })
    .select('questionId')
    .lean()
  const excludeIds = votedIds.map((v) => v.questionId)

  // Never let a reviewer review their own generated questions.
  const queueFilter = {
    status: 'pending',
    createdByAuthId: { $ne: authUser.id },
    ...examFilter,
    ...(excludeIds.length > 0 ? { _id: { $nin: excludeIds } } : {}),
  }

  const items = await QuestionBankModel.find(queueFilter)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean()

  const remaining = await QuestionBankModel.countDocuments(queueFilter)

  return c.json({ items, remaining })
})

// POST /api/contributor/review — submit a vote.
contributorRoutes.post('/review', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => ({}))

  const { questionId, vote, comment, dwellMs } = body
  if (typeof questionId !== 'string' || !questionId) {
    return c.json({ error: 'questionId is required' }, 400)
  }
  if (vote !== 'approve' && vote !== 'reject') {
    return c.json({ error: "vote must be 'approve' or 'reject'" }, 400)
  }
  if (typeof dwellMs !== 'number' || !Number.isFinite(dwellMs) || dwellMs < 0) {
    return c.json({ error: 'dwellMs must be a non-negative number' }, 400)
  }
  if (comment != null && typeof comment !== 'string') {
    return c.json({ error: 'comment must be a string when provided' }, 400)
  }

  try {
    const result = await submitReview({
      reviewerAuthId: authUser.id,
      questionId,
      vote,
      comment: comment ?? null,
      dwellMs,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof ReviewError) {
      return c.json({ error: err.message }, err.status as 400 | 403 | 404 | 409)
    }
    console.error('[contributor/review] failed:', err)
    return c.json({ error: 'Review submission failed' }, 500)
  }
})

// POST /api/contributor/skip — opt out of a question. Records a non-billable
// event so the question stays out of this reviewer's queue.
contributorRoutes.post('/skip', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const questionId = body.questionId

  if (typeof questionId !== 'string' || !questionId) {
    return c.json({ error: 'questionId is required' }, 400)
  }

  const user = await UserModel.findOne({ authId: authUser.id })
    .select('_id')
    .lean()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const question = await QuestionBankModel.findById(questionId).select('examCode').lean()
  if (!question) return c.json({ error: 'Question not found' }, 404)

  try {
    await ReviewEventModel.create({
      reviewerId: user._id,
      questionId: question._id,
      examCode: question.examCode,
      vote: 'approve', // placeholder — billable:false makes it inert
      comment: null,
      dwellMs: 0,
      rateCents: 0,
      billable: false,
      notBillableReason: 'duplicate',
      at: new Date(),
    })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: unknown }).code === 11000
    ) {
      // already voted/skipped — no-op
    } else {
      console.error('[contributor/skip] failed:', err)
      return c.json({ error: 'Skip failed' }, 500)
    }
  }

  return c.json({ ok: true })
})

// GET /api/contributor/earnings — per-period summary, lifetime totals.
contributorRoutes.get('/earnings', async (c) => {
  const authUser = c.get('user')
  const user = await UserModel.findOne({ authId: authUser.id })
    .select('_id')
    .lean()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const payouts = await ContributorPayoutModel.find({ reviewerId: user._id })
    .sort({ periodStart: -1 })
    .lean()

  // Pending = billable events not yet attached to a payout.
  const pendingAgg = await ReviewEventModel.aggregate<{
    _id: string
    count: number
    cents: number
  }>([
    {
      $match: {
        reviewerId: user._id,
        billable: true,
      },
    },
    {
      $group: {
        _id: '$examCode',
        count: { $sum: 1 },
        cents: { $sum: '$rateCents' },
      },
    },
  ])

  // Subtract events already covered by payouts (period-bounded).
  const paidPerExam = new Map<string, number>()
  for (const p of payouts) {
    for (const b of p.perExamBreakdown ?? []) {
      paidPerExam.set(b.examCode, (paidPerExam.get(b.examCode) ?? 0) + b.reviewCount)
    }
  }

  const pendingByExam = pendingAgg.map((row) => {
    const paid = paidPerExam.get(row._id) ?? 0
    const pendingCount = Math.max(0, row.count - paid)
    const avgRate = row.count > 0 ? row.cents / row.count : 0
    return {
      examCode: row._id,
      pendingCount,
      pendingCents: Math.round(pendingCount * avgRate),
    }
  })

  const pendingTotalCents = pendingByExam.reduce((sum, p) => sum + p.pendingCents, 0)
  const paidTotalCents = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountCents, 0)

  return c.json({
    pendingByExam,
    pendingTotalCents,
    paidTotalCents,
    payouts: payouts.map((p) => ({
      _id: String(p._id),
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      perExamBreakdown: p.perExamBreakdown,
      reviewCount: p.reviewCount,
      amountCents: p.amountCents,
      status: p.status,
      paidAt: p.paidAt,
    })),
  })
})

export default contributorRoutes
