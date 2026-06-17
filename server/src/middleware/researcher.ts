import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from '../types.js'
import { UserModel } from '../features/shared/user/user.model.js'

export const requireResearcher = createMiddleware<AuthEnv>(async (c, next) => {
  const authUser = c.get('user')

  const user = await UserModel.findOne({ authId: authUser.id })
    .select('role')
    .lean()

  if (user?.role === 'admin' || user?.role === 'researcher') {
    await next()
    return
  }

  return c.json({ error: 'Researcher access required.' }, 403)
})
