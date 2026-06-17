import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import type { AuthEnv } from '../../../types.js'
import { UserModel } from './user.model.js'
import { SessionModel } from '../../learn/session/session.model.js'
import { FriendshipModel } from '../friendship/friendship.model.js'
import { mongoClient } from '../../../config/db.js'
import { PlanModel } from '../../learn/plan/plan.model.js'
import { TopicModel } from '../../learn/custom-plan/topic.model.js'
import { ExamModel } from '../../learn/exam/exam.model.js'

const userRoutes = new Hono<AuthEnv>()

userRoutes.use(requireAuth)

// GET /api/user/me — get the current user's profile
userRoutes.get('/me', async (c) => {
  const authUser = c.get('user')

  let user = await UserModel.findOne({ authId: authUser.id })

  // First login — create profile from OAuth data
  if (!user) {
    console.log(`Creating user profile for ${authUser.id} (${authUser.name ?? 'unknown'})`)
    try {
      const [firstName = '', lastName = ''] = (authUser.name ?? '').split(' ', 2)
      user = await UserModel.create({
        authId: authUser.id,
        firstName,
        lastName,
      })
      console.log(`User profile created: ${user._id}`)
    } catch (err) {
      console.error('Failed to create user profile:', err)
      throw err
    }
  }

  return c.json(user)
})

// PATCH /api/user/me — update the current user's profile
userRoutes.patch('/me', async (c) => {
  const authUser = c.get('user')
  const updates = await c.req.json()

  // Only allow updating these fields.
  // NOTE: examDate and dailyGoal are intentionally NOT writable here — they are
  // per-plan settings whose source of truth is the Plan document (see
  // /me/stats, which reads examDate from Plan). The legacy User-level copies are
  // deprecated; accepting writes to them would just reintroduce drift.
  const allowed = [
    'username',
    'firstName',
    'lastName',
    'displayName',
    'activeExam',
    'exams',
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

  // Closest exam date from plans
  const plans = await PlanModel.find({ authId: authUser.id, examDate: { $ne: null } })
    .sort({ examDate: 1 })
    .lean()

  let daysToExam: number | null = null
  let nextExamLabel: string | null = null

  const now = Date.now()
  for (const p of plans) {
    if (p.examDate && p.examDate.getTime() > now) {
      daysToExam = Math.ceil((p.examDate.getTime() - now) / 86400000)
      if (p.type === 'custom') {
        nextExamLabel = p.examName ?? p.examCode
      } else {
        const exam = await ExamModel.findOne({ code: p.examCode }).select('label').lean()
        nextExamLabel = exam?.label ?? p.examCode
      }
      break
    }
  }

  // Masteries — count topics where mastery >= 80
  const allTopicPlanIds = (await PlanModel.find({ authId: authUser.id }).select('_id').lean()).map((p) => p._id)
  const masteredCount = await TopicModel.countDocuments({
    planId: { $in: allTopicPlanIds },
    mastery: { $gte: 80 },
  })
  const totalTopics = await TopicModel.countDocuments({
    planId: { $in: allTopicPlanIds },
  })

  return c.json({
    totalQuestions,
    accuracy,
    streak,
    daysToExam,
    nextExamLabel,
    masteredCount,
    totalTopics,
  })
})

// GET /api/user/search?q=<email or username> — search for users to add as friends
userRoutes.get('/search', async (c) => {
  const me = c.get('user').id
  const q = c.req.query('q')?.trim()

  if (!q || q.length < 3) {
    return c.json({ error: 'Query must be at least 3 characters' }, 400)
  }

  const regex = new RegExp(q, 'i')

  // Search Better Auth's user collection (all signed-in users exist here)
  const authUsers = await mongoClient.db().collection('user').find({
    _id: { $ne: me } as any,
    $or: [
      { name: regex },
      { email: regex },
    ],
  })
    .limit(10)
    .toArray()

  // Also check Mongoose users collection for username matches
  const appUsers = await UserModel.find({
    authId: { $ne: me },
    username: regex,
  })
    .select('authId username')
    .limit(10)
    .lean()

  // Merge results — Better Auth users are the primary source
  const results = authUsers.map((au) => {
    const appUser = appUsers.find((u) => u.authId === String(au._id))
    const [firstName = '', lastName = ''] = (au.name ?? '').split(' ', 2)
    return {
      authId: String(au._id),
      username: appUser?.username ?? null,
      firstName,
      lastName,
      email: au.email,
    }
  })

  // Add any username-only matches not already in results
  for (const u of appUsers) {
    if (!results.some((r) => r.authId === u.authId)) {
      results.push({
        authId: u.authId,
        username: u.username ?? null,
        firstName: '',
        lastName: '',
        email: '',
      })
    }
  }

  return c.json(results)
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

  // Pull every session for the cohort in a single query, then aggregate in
  // memory. (Previously this ran a find + an aggregate per user — an N+1 that
  // scaled query count with friend count.)
  const sessions = await SessionModel.find({ authId: { $in: allIds } })
    .select('authId completedAt totalQuestions')
    .lean()

  const byUser = new Map<string, { days: Set<string>; totalQuestions: number }>()
  for (const id of allIds) byUser.set(id, { days: new Set(), totalQuestions: 0 })
  for (const s of sessions) {
    const agg = byUser.get(s.authId)
    if (!agg) continue
    agg.days.add(new Date(s.completedAt).toISOString().slice(0, 10))
    agg.totalQuestions += s.totalQuestions ?? 0
  }

  // Compute streak for each user
  const today = new Date()
  const entries = allIds.map((authId) => {
    const agg = byUser.get(authId)!
    const uniqueDays = [...agg.days].sort().reverse()

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

    const user = users.find((u) => u.authId === authId)

    return {
      authId,
      username: user?.username ?? null,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      isMe: authId === me,
      streak,
      totalQuestions: agg.totalQuestions,
    }
  })

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
