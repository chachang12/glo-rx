import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import type { AuthEnv } from '../../../types.js'
import { PlanModel } from './plan.model.js'
import { ExamModel, QuestionBankModel } from '../exam/exam.model.js'
import { TopicModel } from '../custom-plan/topic.model.js'
import { RoadmapDayModel } from '../custom-plan/roadmap-day.model.js'
import { computeMastery } from '../custom-plan/mastery.algorithm.js'
import { generateRoadmap } from '../custom-plan/roadmap.algorithm.js'
import {
  generateQuestionsForTopic,
  GenerationError,
} from '../generation/generate-questions.service.js'
import { UserModel } from '../../shared/user/user.model.js'

const planRoutes = new Hono<AuthEnv>()

planRoutes.use(requireAuth)

// Admins get auto-enrolled in every coming-soon exam so they can test
// against the upcoming launch without manual setup. Idempotent — only
// creates plans for exams the admin doesn't already have one for, and
// seeds topics on each newly-created plan.
async function ensureAdminComingSoonPlans(authId: string) {
  const exams = await ExamModel.find({ visibility: 'coming-soon' })
    .select('code topics')
    .lean()
  if (exams.length === 0) return

  const existing = await PlanModel.find({
    authId,
    examCode: { $in: exams.map((e) => e.code) },
  })
    .select('examCode')
    .lean()

  const have = new Set(existing.map((p) => p.examCode))
  const missing = exams.filter((e) => !have.has(e.code))
  if (missing.length === 0) return

  for (const exam of missing) {
    const plan = await PlanModel.create({
      authId,
      examCode: exam.code,
      examDate: null,
      dailyGoal: null,
    })

    if (exam.topics?.length) {
      await TopicModel.insertMany(
        exam.topics.map((label, i) => ({
          planId: plan._id,
          label,
          sortOrder: i,
        }))
      )
    }
  }
}

// GET /api/plans — list all plans for the current user
planRoutes.get('/', async (c) => {
  const authUser = c.get('user')

  const me = await UserModel.findOne({ authId: authUser.id }).select('role').lean()
  if (me?.role === 'admin') {
    await ensureAdminComingSoonPlans(authUser.id)
  }

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

// ── POST /:examCode/topics/:topicId/generate-questions — AI question gen ───

planRoutes.post('/:examCode/topics/:topicId/generate-questions', async (c) => {
  const authUser = c.get('user')
  const { examCode, topicId } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topic = await TopicModel.findOne({ _id: topicId, planId: plan._id }).lean()
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  const body = await c.req.json().catch(() => ({}))

  try {
    const result = await generateQuestionsForTopic({
      topicId: topic._id,
      count: body.count,
      allowedTypes: body.types,
      typeWeights: body.typeWeights,
      difficulty: body.difficulty,
      customInstructions: body.customInstructions,
      force: !!body.force,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof GenerationError) {
      return c.json({ error: err.message }, err.status as 400 | 404 | 409 | 502)
    }
    console.error('Question generation failed:', err)
    return c.json({ error: 'Question generation failed. Please try again.' }, 500)
  }
})

// ── GET /:examCode/topics/:topicId/questions — Cached topic questions ───────

planRoutes.get('/:examCode/topics/:topicId/questions', async (c) => {
  const authUser = c.get('user')
  const { examCode, topicId } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topic = await TopicModel.findOne({ _id: topicId, planId: plan._id }).lean()
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  const questions = await QuestionBankModel.find({
    topicId: topic._id,
    status: 'published',
  })
    .sort({ createdAt: -1 })
    .lean()

  return c.json({
    topicId: String(topic._id),
    topicLabel: topic.label,
    questions: questions.map((q) => ({
      id: String(q._id),
      type: q.type,
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    })),
  })
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

  const counts = await QuestionBankModel.aggregate([
    {
      $match: {
        topicId: { $in: topics.map((t) => t._id) },
        status: 'published',
      },
    },
    { $group: { _id: '$topicId', count: { $sum: 1 } } },
  ])
  const countByTopic = new Map(counts.map((c) => [String(c._id), c.count]))

  // Standard plans don't have user-uploaded source excerpts, but they can fall
  // back to admin-supplied aiReferenceText. Surface availability so the UI
  // can show or hide the Generate CTA accordingly.
  const exam = await ExamModel.findOne({ code: examCode })
    .select('aiReferenceText allowedQuestionTypes')
    .lean()
  const examHasReference = !!(exam?.aiReferenceText && exam.aiReferenceText.trim())
  const allowedQuestionTypes =
    exam?.allowedQuestionTypes && exam.allowedQuestionTypes.length > 0
      ? exam.allowedQuestionTypes
      : ['mcq']

  return c.json({
    readiness,
    topicCount: topics.length,
    allowedQuestionTypes,
    topics: topics.map((t) => ({
      id: t._id,
      label: t.label,
      description: t.description ?? '',
      mastery: t.mastery,
      questionsAnswered: t.questionsAnswered,
      correctCount: t.correctCount,
      hasSourceExcerpts: (t.sourceExcerpts?.length ?? 0) > 0 || examHasReference,
      generatedQuestionCount: countByTopic.get(String(t._id)) ?? 0,
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
