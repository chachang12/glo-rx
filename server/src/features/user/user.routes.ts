import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { UserModel } from './user.model.js'
import { SessionModel } from '../session/session.model.js'
import { FriendshipModel } from '../friendship/friendship.model.js'

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
    'username',
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

// GET /api/user/search?q=<email or username> — search for users to add as friends
userRoutes.get('/search', async (c) => {
  const me = c.get('user').id
  const q = c.req.query('q')?.trim()

  if (!q || q.length < 3) {
    return c.json({ error: 'Query must be at least 3 characters' }, 400)
  }

  // Search by email (via Better Auth's user collection) or username
  const users = await UserModel.find({
    authId: { $ne: me },
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
    ],
  })
    .select('authId username firstName lastName')
    .limit(10)
    .lean()

  return c.json(users)
})

// GET /api/user/leaderboard — friends leaderboard with streaks
userRoutes.get('/leaderboard', async (c) => {
  const me = c.get('user').id

  // Get accepted friends
  const friendships = await FriendshipModel.find({
    $or: [{ requester: me }, { recipient: me }],
    status: 'accepted',
  }).lean()

  const friendIds = friendships.map((f) =>
    f.requester === me ? f.recipient : f.requester
  )

  // Include self
  const allIds = [me, ...friendIds]

  // Get user profiles
  const users = await UserModel.find({ authId: { $in: allIds } })
    .select('authId username firstName lastName')
    .lean()

  // Compute streak for each user
  const today = new Date()
  const entries = await Promise.all(
    allIds.map(async (authId) => {
      const sessions = await SessionModel.find({ authId })
        .select('completedAt')
        .lean()

      const uniqueDays = [
        ...new Set(
          sessions.map((s) =>
            new Date(s.completedAt).toISOString().slice(0, 10)
          )
        ),
      ].sort().reverse()

      let streak = 0
      for (let i = 0; i < uniqueDays.length; i++) {
        const expected = new Date(today)
        expected.setDate(today.getDate() - i)
        if (uniqueDays[i] === expected.toISOString().slice(0, 10)) {
          streak++
        } else {
          break
        }
      }

      const totalQuestions = sessions.length > 0
        ? (await SessionModel.aggregate([
            { $match: { authId } },
            { $group: { _id: null, total: { $sum: '$totalQuestions' } } },
          ]))[0]?.total ?? 0
        : 0

      const user = users.find((u) => u.authId === authId)

      return {
        authId,
        username: user?.username ?? null,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        isMe: authId === me,
        streak,
        totalQuestions,
      }
    })
  )

  // Sort by streak descending, then totalQuestions
  entries.sort((a, b) => b.streak - a.streak || b.totalQuestions - a.totalQuestions)

  return c.json(entries)
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
