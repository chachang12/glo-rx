import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { PlanModel } from './plan.model.js'
import { ExamModel } from '../exam/exam.model.js'
import { TopicModel } from '../custom-plan/topic.model.js'
import { RoadmapDayModel } from '../custom-plan/roadmap-day.model.js'
import { computeMastery } from '../custom-plan/mastery.algorithm.js'
import { generateRoadmap } from '../custom-plan/roadmap.algorithm.js'

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

  const examExists = body.examCode && await ExamModel.exists({ code: body.examCode })
  if (!examExists) {
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

  // Seed topics from exam definition
  const exam = await ExamModel.findOne({ code: body.examCode }).lean()
  if (exam?.topics?.length) {
    await TopicModel.insertMany(
      exam.topics.map((label, i) => ({
        planId: plan._id,
        label,
        sortOrder: i,
      }))
    )
  }

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

  // Clean up associated data
  await Promise.all([
    TopicModel.deleteMany({ planId: result._id }),
    RoadmapDayModel.deleteMany({ planId: result._id }),
  ])

  return c.json({ success: true })
})

// ── GET /:examCode/topics — Get topics with mastery ─────────────────────────

planRoutes.get('/:examCode/topics', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topics = await TopicModel.find({ planId: plan._id })
    .sort({ sortOrder: 1 })
    .lean()

  return c.json(topics)
})

// ── PATCH /:examCode/topics/:topicId/record — Record a practice answer ──────

planRoutes.patch('/:examCode/topics/:topicId/record', async (c) => {
  const authUser = c.get('user')
  const { examCode, topicId } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const body = await c.req.json()
  if (typeof body.correct !== 'boolean') {
    return c.json({ error: 'correct (boolean) is required' }, 400)
  }

  const topic = await TopicModel.findOne({ _id: topicId, planId: plan._id })
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  const newMastery = computeMastery(topic.mastery, topic.questionsAnswered, body.correct)
  topic.questionsAnswered += 1
  if (body.correct) topic.correctCount += 1
  topic.mastery = newMastery
  await topic.save()

  return c.json(topic)
})

// ── GET /:examCode/readiness — Overall readiness score ──────────────────────

planRoutes.get('/:examCode/readiness', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topics = await TopicModel.find({ planId: plan._id })
    .sort({ sortOrder: 1 })
    .lean()

  if (topics.length === 0) {
    return c.json({ readiness: 0, topicCount: 0, topics: [] })
  }

  const readiness = Math.round(
    topics.reduce((sum, t) => sum + t.mastery, 0) / topics.length
  )

  return c.json({
    readiness,
    topicCount: topics.length,
    topics: topics.map((t) => ({
      id: t._id,
      label: t.label,
      mastery: t.mastery,
      questionsAnswered: t.questionsAnswered,
      correctCount: t.correctCount,
    })),
  })
})

// ── POST /:examCode/roadmap/generate — Generate study roadmap ───────────────

planRoutes.post('/:examCode/roadmap/generate', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode })
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  if (!plan.examDate) {
    return c.json({ error: 'Set an exam date before generating a roadmap' }, 400)
  }

  const topics = await TopicModel.find({ planId: plan._id })
    .sort({ sortOrder: 1 })
    .lean()

  if (topics.length === 0) {
    return c.json({ error: 'No topics found for this plan' }, 400)
  }

  const now = new Date()
  const daysUntilExam = Math.ceil(
    (plan.examDate.getTime() - now.getTime()) / 86400000
  )

  if (daysUntilExam < 7) {
    return c.json({ error: 'Exam date must be at least 7 days away' }, 400)
  }

  const roadmapDays = generateRoadmap(topics, now, plan.examDate)

  await RoadmapDayModel.deleteMany({ planId: plan._id })
  await RoadmapDayModel.insertMany(
    roadmapDays.map((day) => ({ planId: plan._id, ...day }))
  )

  const created = await RoadmapDayModel.find({ planId: plan._id })
    .sort({ dayNumber: 1 })
    .lean()

  return c.json(created, 201)
})

// ── GET /:examCode/roadmap — Get study roadmap ──────────────────────────────

planRoutes.get('/:examCode/roadmap', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const days = await RoadmapDayModel.find({ planId: plan._id })
    .sort({ dayNumber: 1 })
    .lean()

  const allTopicIds = [...new Set(days.flatMap((d) => d.topicIds.map(String)))]
  const topicMap = new Map<string, string>()

  if (allTopicIds.length > 0) {
    const topics = await TopicModel.find({ _id: { $in: allTopicIds } })
      .select('label')
      .lean()
    for (const t of topics) {
      topicMap.set(String(t._id), t.label)
    }
  }

  const enriched = days.map((d) => ({
    ...d,
    topicLabels: d.topicIds.map((id) => topicMap.get(String(id)) ?? 'Unknown'),
  }))

  return c.json(enriched)
})

// ── PATCH /:examCode/roadmap/:dayNumber/complete — Mark a day complete ──────

planRoutes.patch('/:examCode/roadmap/:dayNumber/complete', async (c) => {
  const authUser = c.get('user')
  const { examCode, dayNumber } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const day = await RoadmapDayModel.findOneAndUpdate(
    { planId: plan._id, dayNumber: parseInt(dayNumber) },
    { $set: { completed: true } },
    { new: true }
  )

  if (!day) return c.json({ error: 'Roadmap day not found' }, 404)
  return c.json(day)
})

export default planRoutes
