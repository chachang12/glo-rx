import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from '../types.js'
import { UserModel } from '../features/user/user.model.js'

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const authUser = c.get('user')

  const user = await UserModel.findOne({ authId: authUser.id })
    .select('role')
    .lean()

  if (user?.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await next()
})
