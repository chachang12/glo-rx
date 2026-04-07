import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { UserModel } from './user.model.js'
import { SessionModel } from '../session/session.model.js'

const userRoutes = new Hono<AuthEnv>()

userRoutes.use(requireAuth)

// GET /api/user/me — get the current user's profile
userRoutes.get('/me', async (c) => {
  const authUser = c.get('user')

  let user = await UserModel.findOne({ authId: authUser.id })

  // First login — create profile from OAuth data
  if (!user) {
    const [firstName = '', lastName = ''] = (authUser.name ?? '').split(' ', 2)
    user = await UserModel.create({
      authId: authUser.id,
      firstName,
      lastName,
    })
  }

  return c.json(user)
})

// PATCH /api/user/me — update the current user's profile
userRoutes.patch('/me', async (c) => {
  const authUser = c.get('user')
  const updates = await c.req.json()

  // Only allow updating these fields
  const allowed = [
    'firstName',
    'lastName',
    'displayName',
    'activeExam',
    'exams',
    'examDate',
    'dailyGoal',
    'defaultSessionLength',
    'onboardingComplete',
  ] as const

  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) {
      filtered[key] = updates[key]
    }
  }

  const user = await UserModel.findOneAndUpdate(
    { authId: authUser.id },
    { $set: filtered },
    { new: true }
  )

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(user)
})

// GET /api/user/me/stats — aggregated stats for the dashboard
userRoutes.get('/me/stats', async (c) => {
  const authUser = c.get('user')
  const user = await UserModel.findOne({ authId: authUser.id }).lean()

  // Total questions & accuracy
  const sessions = await SessionModel.find({ authId: authUser.id }).lean()

  const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0)
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0)
  const accuracy = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : null

  // Streak — count consecutive days with at least one session
  const uniqueDays = [
    ...new Set(
      sessions.map((s) =>
        new Date(s.completedAt).toISOString().slice(0, 10)
      )
    ),
  ].sort().reverse()

  let streak = 0
  const today = new Date()
  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    const expectedStr = expected.toISOString().slice(0, 10)
    if (uniqueDays[i] === expectedStr) {
      streak++
    } else {
      break
    }
  }

  // Days to exam
  let daysToExam: number | null = null
  if (user?.examDate) {
    const diff = new Date(user.examDate).getTime() - Date.now()
    daysToExam = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  // Sessions completed
  const sessionsCompleted = sessions.length

  // Average time per question
  const totalTimeMs = sessions.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)
  const avgTimePerQuestion = totalQuestions > 0
    ? Math.round(totalTimeMs / totalQuestions / 1000)
    : null

  return c.json({
    totalQuestions,
    accuracy,
    streak,
    daysToExam,
    sessionsCompleted,
    avgTimePerQuestion,
  })
})

// DELETE /api/user/me — delete the current user's profile and data
userRoutes.delete('/me', async (c) => {
  const authUser = c.get('user')

  const result = await UserModel.findOneAndDelete({ authId: authUser.id })

  if (!result) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ success: true })
})

export default userRoutes
