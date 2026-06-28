import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from '../types.js'
import { capabilitiesForUser } from '../features/shared/user/user.tier.js'
import { PlanModel } from '../features/learn/plan/plan.model.js'

/**
 * Tier/quota enforcement. These gates replace the old boolean `requireLicense`
 * checks: capabilities derive from the caller's subscription tier (see
 * `docs/licensing.md`). They emit a structured `reason: 'tier_limit'` error so
 * the client can render a contextual upgrade CTA. `requireAuth` must run first
 * (these read `c.get('appUser')`).
 */

type BooleanCapability = 'canGenerateTests'

/** Gates a boolean tier capability (e.g. AI test generation). */
export function requireCapability(key: BooleanCapability) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const caps = capabilitiesForUser(c.get('appUser'))
    if (!caps[key]) {
      return c.json(
        { error: 'This feature requires Axeous Pro.', reason: 'tier_limit', capability: key },
        402
      )
    }
    await next()
  })
}

/** Enforces the per-account custom-plan count quota before creating a plan. */
export const requireCustomPlanQuota = createMiddleware<AuthEnv>(async (c, next) => {
  const { maxCustomPlans } = capabilitiesForUser(c.get('appUser'))
  const authId = c.get('user').id
  const count = await PlanModel.countDocuments({ authId, type: 'custom' })
  if (count >= maxCustomPlans) {
    return c.json(
      {
        error: `You've reached your custom plan limit (${maxCustomPlans}). Upgrade to Axeous Pro for more.`,
        reason: 'tier_limit',
        capability: 'maxCustomPlans',
      },
      402
    )
  }
  await next()
})
