import { Hono } from 'hono'
import type { AuthEnv } from '../../../types.js'
import contributorRoutes from './contributor.routes.js'
import { inviteAcceptRoutes } from './invite.routes.js'

// Aggregator mounted under /api/contributor. The invite-acceptance subtree
// must mount before the contributor-gated routes so an invitee (still a
// regular user) can hit /api/contributor/invite/:token/accept before the
// requireContributor middleware on the rest would reject them.
const contributorFeatureRoutes = new Hono<AuthEnv>()

contributorFeatureRoutes.route('/invite', inviteAcceptRoutes)
contributorFeatureRoutes.route('/', contributorRoutes)

export { contributorFeatureRoutes }
