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
