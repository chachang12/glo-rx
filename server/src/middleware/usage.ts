import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from '../types.js'
import { PlanModel } from '../features/plan/plan.model.js'
import { getLimitsForTier } from '../config/usage.js'

/**
 * Requires an active plan for the given examCode (from body or query)
 * and checks that the user hasn't exceeded their daily AI call limit.
 * Increments usage atomically on success.
 *
 * For POST requests, parses the body and stores it in c.get('parsedBody')
 * so downstream handlers don't need to re-parse.
 */
export const requireUsage = createMiddleware<AuthEnv>(async (c, next) => {
  const authUser = c.get('user')

  // Resolve examCode from body or query
  let examCode: string | undefined
  if (c.req.method === 'POST') {
    const body = await c.req.json()
    examCode = body.examCode
    c.set('parsedBody', body)
  } else {
    examCode = c.req.query('examCode') ?? undefined
  }

  if (!examCode) {
    return c.json({ error: 'examCode is required' }, 400)
  }

  const now = new Date()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode })

  if (!plan) {
    return c.json({ error: 'No active plan for this exam' }, 403)
  }

  // Reset usage if the window has expired
  if (plan.usageResetAt && now >= plan.usageResetAt) {
    plan.usageCount = 0
    const reset = new Date(now)
    reset.setUTCHours(24, 0, 0, 0)
    plan.usageResetAt = reset
  }

  // Check limit
  const limits = getLimitsForTier(plan.tier ?? 'free')
  if (plan.usageCount >= limits.dailyAiCalls) {
    return c.json(
      { error: 'Daily AI usage limit reached. Try again tomorrow.' },
      429
    )
  }

  // Increment usage atomically
  plan.usageCount += 1
  await plan.save()

  await next()
})
