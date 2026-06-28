export type Tier = 'free' | 'pro'

/**
 * Capabilities granted at each tier. This is the server-side mirror of
 * `docs/licensing.md` — the two MUST be changed together. The client reads
 * the resolved capabilities from the API; it must never hardcode these.
 */
export interface TierCapabilities {
  /** AI generation requests allowed per day. One request = one batch (~10 items). */
  dailyAiCalls: number
  /** Custom study plans allowed per account. */
  maxCustomPlans: number
  /** Uploaded files allowed per custom plan. */
  maxFilesPerPlan: number
  /** Whether the user may generate fresh AI test sets (reserved; feature TBD). */
  canGenerateTests: boolean
}

export const TIER_CAPABILITIES: Record<Tier, TierCapabilities> = {
  free: { dailyAiCalls: 10, maxCustomPlans: 1, maxFilesPerPlan: 5, canGenerateTests: false },
  pro: { dailyAiCalls: 50, maxCustomPlans: 5, maxFilesPerPlan: 20, canGenerateTests: true },
}

export function getCapabilities(tier: string): TierCapabilities {
  return TIER_CAPABILITIES[tier as Tier] ?? TIER_CAPABILITIES.free
}

/**
 * The next daily usage-window reset: the upcoming midnight UTC. Shared by the
 * plan model default and the usage middleware so the reset boundary is defined
 * in exactly one place.
 */
export function getNextDailyReset(from: Date = new Date()): Date {
  const reset = new Date(from)
  reset.setUTCDate(reset.getUTCDate() + 1)
  reset.setUTCHours(0, 0, 0, 0)
  return reset
}
