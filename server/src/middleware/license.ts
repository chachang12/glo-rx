import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from '../types.js'
import { UserModel } from '../features/user/user.model.js'

type LicenseKey = 'aiGeneration' | 'customPlans'

/**
 * Factory that creates a middleware checking for a specific license.
 * The user must be authenticated (requireAuth should run first).
 */
export function requireLicense(key: LicenseKey) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const authUser = c.get('user')

    const user = await UserModel.findOne({ authId: authUser.id })
      .select('licenses role')
      .lean()

    // Admins bypass all license checks
    if (user?.role === 'admin') {
      await next()
      return
    }

    if (!user?.licenses || !user.licenses[key]) {
      return c.json(
        { error: 'This feature requires an active license. Upgrade your plan to access this feature.' },
        403
      )
    }

    await next()
  })
}
