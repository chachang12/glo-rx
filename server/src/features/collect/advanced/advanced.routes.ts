import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import type { AuthEnv } from '../../../types.js'
import { UserModel } from '../../shared/user/user.model.js'
import { ADVANCED_COLLECT_KEY } from './advanced.constants.js'

const advancedRoutes = new Hono<AuthEnv>()

advancedRoutes.use(requireAuth)

// POST /redeem — exchange a key for advanced mode on the current user.
advancedRoutes.post('/redeem', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => null)
  const key = body && typeof body === 'object' ? (body as { key?: unknown }).key : null

  if (typeof key !== 'string' || key.trim() === '') {
    return c.json({ error: 'key required' }, 400)
  }

  if (key.trim() !== ADVANCED_COLLECT_KEY) {
    return c.json({ error: 'Invalid key' }, 403)
  }

  const user = await UserModel.findOneAndUpdate(
    { authId: authUser.id },
    { $set: { advancedCollectMode: true } },
    { new: true }
  )
  if (!user) return c.json({ error: 'user not found' }, 404)

  return c.json({ advancedCollectMode: true })
})

export default advancedRoutes
export { advancedRoutes }
