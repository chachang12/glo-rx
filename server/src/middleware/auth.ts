import { createMiddleware } from 'hono/factory'
import { auth } from '../lib/auth.js'
import type { AuthEnv } from '../types.js'
import { UserModel } from '../features/shared/user/user.model.js'

function splitName(name: string | null | undefined): [string, string] {
  const [first = '', last = ''] = (name ?? '').trim().split(' ', 2)
  return [first, last]
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', session.user)
  c.set('session', session.session)

  // Safety net: keep the BetterAuth user → UserModel mapping intact even
  // for accounts whose create.after hook never ran (historical orphans,
  // hook regressions). One round-trip — upsert is atomic and idempotent.
  const [firstName, lastName] = splitName(session.user.name)
  const appUser = await UserModel.findOneAndUpdate(
    { authId: session.user.id },
    { $setOnInsert: { authId: session.user.id, firstName, lastName } },
    { upsert: true, new: true }
  )

  c.set('appUser', appUser)

  await next()
})
