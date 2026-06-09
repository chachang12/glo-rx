import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from '../types.js'
import { UserModel } from '../features/shared/user/user.model.js'

/**
 * Gate on contributor role. Admins always pass. If `examCode` is provided,
 * the contributor must have a matching scope entry. Mirrors the factory
 * pattern from license.ts.
 *
 * Downstream handlers can re-fetch the user; this middleware deliberately
 * does not stash anything on the context to keep the surface minimal.
 */
export function requireContributor(examCode?: string) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const authUser = c.get('user')

    const user = await UserModel.findOne({ authId: authUser.id })
      .select('role contributor')
      .lean()

    if (user?.role === 'admin') {
      await next()
      return
    }

    if (user?.role !== 'contributor' || !user.contributor) {
      return c.json({ error: 'Contributor access required.' }, 403)
    }

    if (examCode) {
      const scope = (user.contributor.scopes ?? []).find((s) => s.examCode === examCode)
      if (!scope) {
        return c.json({ error: `Not authorized for exam ${examCode}.` }, 403)
      }
    }

    await next()
  })
}
