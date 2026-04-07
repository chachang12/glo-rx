import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { PlanModel } from './plan.model.js'
import { EXAM_CODES } from '../../config/exams.js'

const planRoutes = new Hono<AuthEnv>()

planRoutes.use(requireAuth)

// GET /api/plans — list all plans for the current user
planRoutes.get('/', async (c) => {
  const authUser = c.get('user')

  const plans = await PlanModel.find({ authId: authUser.id })
    .sort({ createdAt: -1 })
    .lean()

  return c.json(plans)
})

// GET /api/plans/:examCode — get a specific plan
planRoutes.get('/:examCode', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({
    authId: authUser.id,
    examCode,
  }).lean()

  if (!plan) {
    return c.json({ error: 'Plan not found' }, 404)
  }

  return c.json(plan)
})

// POST /api/plans — create a plan (enroll in an exam)
planRoutes.post('/', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json()

  if (!body.examCode || !EXAM_CODES.includes(body.examCode)) {
    return c.json({ error: 'Invalid exam code' }, 400)
  }

  // Check for existing plan
  const existing = await PlanModel.findOne({
    authId: authUser.id,
    examCode: body.examCode,
  })

  if (existing) {
    return c.json({ error: 'Plan already exists for this exam' }, 409)
  }

  const plan = await PlanModel.create({
    authId: authUser.id,
    examCode: body.examCode,
    examDate: body.examDate ?? null,
    dailyGoal: body.dailyGoal ?? null,
  })

  return c.json(plan, 201)
})

// PATCH /api/plans/:examCode — update plan settings
planRoutes.patch('/:examCode', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()
  const updates = await c.req.json()

  const allowed = ['examDate', 'dailyGoal', 'status'] as const

  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) {
      filtered[key] = updates[key]
    }
  }

  const plan = await PlanModel.findOneAndUpdate(
    { authId: authUser.id, examCode },
    { $set: filtered },
    { new: true }
  )

  if (!plan) {
    return c.json({ error: 'Plan not found' }, 404)
  }

  return c.json(plan)
})

// DELETE /api/plans/:examCode — remove a plan
planRoutes.delete('/:examCode', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const result = await PlanModel.findOneAndDelete({
    authId: authUser.id,
    examCode,
  })

  if (!result) {
    return c.json({ error: 'Plan not found' }, 404)
  }

  return c.json({ success: true })
})

export default planRoutes
