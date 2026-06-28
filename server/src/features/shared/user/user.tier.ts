import { getCapabilities, type Tier, type TierCapabilities } from '../../../config/usage.js'

/**
 * The subset of a user needed to resolve tier. Kept structural (rather than
 * importing the Mongoose type) so this module has no dependency on the model
 * and can be imported from middleware without a cycle.
 */
type TierInputs = {
  role?: string | null
  subscription?: { status?: string | null } | null
}

/**
 * Resolves a user's effective tier. Pro is granted to active subscribers and,
 * as an override, to admins. Everything else is free. This is the single
 * interpretation of "is this user Pro?" used across the server.
 */
export function tierForUser(user: TierInputs | null | undefined): Tier {
  if (!user) return 'free'
  if (user.role === 'admin') return 'pro'
  if (user.subscription?.status === 'active') return 'pro'
  return 'free'
}

export function capabilitiesForUser(user: TierInputs | null | undefined): TierCapabilities {
  return getCapabilities(tierForUser(user))
}
