export interface TierLimits {
  dailyAiCalls: number
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    dailyAiCalls: 50,
  },
  pro: {
    dailyAiCalls: 500,
  },
}

export function getLimitsForTier(tier: string): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free
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
