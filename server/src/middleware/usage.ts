import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from '../types.js'
import { PlanModel } from '../features/learn/plan/plan.model.js'
import { getLimitsForTier, getNextDailyReset } from '../config/usage.js'

/**
 * Gates AI endpoints on the caller's daily usage quota and increments it.
 *
 * Plan resolution (first match wins):
 *   1. `examCode` from the path / query / body  → standard plans
 *   2. `planId` from the path                   → custom plans
 *   3. the caller's most recently updated plan  → plan-less AI tools (e.g. ABG)
 *
 * The window reset and the limit check + increment are performed with atomic
 * MongoDB updates so concurrent requests can never push usage past the cap
 * (previously a read-modify-save race let parallel calls both slip through).
 *
 * For POST requests the body is parsed once and stashed in `c.get('parsedBody')`
 * so downstream handlers don't re-parse it.
 */
export const requireUsage = createMiddleware<AuthEnv>(async (c, next) => {
  const authUser = c.get('user')

  // Resolve identifiers. Parse the body defensively — some AI endpoints accept
  // an empty body, so a missing/invalid body must not throw here.
  let examCode = c.req.param('examCode') ?? c.req.query('examCode') ?? undefined
  const planId = c.req.param('planId') ?? undefined

  if (c.req.method === 'POST') {
    const body = await c.req.json().catch(() => ({}) as Record<string, unknown>)
    c.set('parsedBody', body)
    if (!examCode && typeof body.examCode === 'string') {
      examCode = body.examCode
    }
  }

  // Find the plan the usage should count against.
  let plan
  if (examCode) {
    plan = await PlanModel.findOne({ authId: authUser.id, examCode })
  } else if (planId) {
    plan = await PlanModel.findOne({ _id: planId, authId: authUser.id })
  } else {
    plan = await PlanModel.findOne({ authId: authUser.id }).sort({ updatedAt: -1 })
  }

  if (!plan) {
    return c.json({ error: 'No active plan for this exam' }, 403)
  }

  const now = new Date()

  // Reset the daily window atomically if it has expired (or was never set).
  await PlanModel.updateOne(
    {
      _id: plan._id,
      $or: [
        { usageResetAt: { $lte: now } },
        { usageResetAt: null },
        { usageResetAt: { $exists: false } },
      ],
    },
    { $set: { usageCount: 0, usageResetAt: getNextDailyReset(now) } }
  )

  // Atomic check-and-increment: only increments while strictly under the cap,
  // so the limit holds even under concurrent requests.
  const limits = getLimitsForTier(plan.tier ?? 'free')
  const updated = await PlanModel.findOneAndUpdate(
    { _id: plan._id, usageCount: { $lt: limits.dailyAiCalls } },
    { $inc: { usageCount: 1 } },
    { new: true }
  )

  if (!updated) {
    return c.json(
      { error: 'Daily AI usage limit reached. Try again tomorrow.' },
      429
    )
  }

  await next()
})
