import { Hono } from 'hono'
import type { AuthEnv } from '../../../types.js'
import { isOfficialPlanProgramPhaseAtLeast } from '../../../config/feature-flags.js'
import baseAdminRoutes from './base.routes.js'
import corpusRoutes from './corpus.routes.js'
import generationRoutes from './generation.routes.js'
import releasesRoutes from './releases.routes.js'
import { adminContributorInviteRoutes } from '../contributor/invite.routes.js'

// Aggregator. Mounts the legacy admin routes (always on) and the Official Plan
// Program admin routes (Phase 1+). Sub-routers each install their own
// requireAuth + requireAdmin chain so the order of mounts doesn't matter.
const adminRoutes = new Hono<AuthEnv>()

adminRoutes.route('/', baseAdminRoutes)

if (isOfficialPlanProgramPhaseAtLeast(1)) {
  adminRoutes.route('/corpus', corpusRoutes)
  // generationRoutes mounts /exams/:code/topics, /generation/..., /questions/promote
  // at the root so paths read naturally under /api/admin.
  adminRoutes.route('/', generationRoutes)
}

if (isOfficialPlanProgramPhaseAtLeast(2)) {
  adminRoutes.route('/contributors', adminContributorInviteRoutes)
}

if (isOfficialPlanProgramPhaseAtLeast(3)) {
  adminRoutes.route('/releases', releasesRoutes)
}

export { adminRoutes }
