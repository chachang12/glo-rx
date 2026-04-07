import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { SessionModel } from './session.model.js'

const sessionRoutes = new Hono<AuthEnv>()

sessionRoutes.use(requireAuth)

// POST /api/sessions — save a completed test session
sessionRoutes.post('/', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json()

  const session = await SessionModel.create({
    authId: authUser.id,
    examCode: body.examCode,
    answers: body.answers,
    totalQuestions: body.totalQuestions,
    correctCount: body.correctCount,
    durationMs: body.durationMs ?? null,
  })

  return c.json(session, 201)
})

// GET /api/sessions — get session history for the current user
sessionRoutes.get('/', async (c) => {
  const authUser = c.get('user')
  const limit = Number(c.req.query('limit') ?? 20)

  const sessions = await SessionModel.find({ authId: authUser.id })
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean()

  return c.json(sessions)
})

export default sessionRoutes
