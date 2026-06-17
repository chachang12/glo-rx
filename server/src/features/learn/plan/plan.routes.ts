import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import { requireUsage } from '../../../middleware/usage.js'
import type { AuthEnv } from '../../../types.js'
import { PlanModel } from './plan.model.js'
import { ExamModel } from '../exam/exam.model.js'
import { TopicModel } from '../custom-plan/topic.model.js'
import { RoadmapDayModel } from '../custom-plan/roadmap-day.model.js'
import {
  buildReadiness,
  recordTopicAnswer,
  getOwnedTopic,
  getVisibleTopicQuestions,
  generateTopicQuestionsResponse,
  generateAndPersistRoadmap,
  getEnrichedRoadmap,
  completeRoadmapDay,
} from './plan-shared.service.js'
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

  const topic = await recordTopicAnswer(plan._id, topicId, body.correct)
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  return c.json(topic)
})

// ── POST /:examCode/topics/:topicId/generate-questions — AI question gen ───

planRoutes.post('/:examCode/topics/:topicId/generate-questions', requireUsage, async (c) => {
  const authUser = c.get('user')
  const { examCode, topicId } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topic = await getOwnedTopic(plan._id, topicId)
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  // Body was parsed and validated-as-optional by requireUsage.
  const body = c.get('parsedBody')
  return generateTopicQuestionsResponse(c, topic._id, body, authUser.id)
})

// ── GET /:examCode/topics/:topicId/questions — Cached topic questions ───────

planRoutes.get('/:examCode/topics/:topicId/questions', async (c) => {
  const authUser = c.get('user')
  const { examCode, topicId } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topic = await getOwnedTopic(plan._id, topicId)
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  // Standard plans share approved questions across all members of the exam,
  // plus the requesting user's own pending generations.
  return c.json(
    await getVisibleTopicQuestions({ examCode, topic, authId: authUser.id })
  )
})

// ── GET /:examCode/readiness — Overall readiness score ──────────────────────

planRoutes.get('/:examCode/readiness', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  // Standard plans don't have user-uploaded source excerpts, but they can fall
  // back to admin-supplied aiReferenceText. Surface availability so the UI can
  // show or hide the Generate CTA accordingly.
  const exam = await ExamModel.findOne({ code: examCode })
    .select('aiReferenceText allowedQuestionTypes')
    .lean()
  const examHasReference = !!(exam?.aiReferenceText && exam.aiReferenceText.trim())
  const allowedQuestionTypes =
    exam?.allowedQuestionTypes && exam.allowedQuestionTypes.length > 0
      ? exam.allowedQuestionTypes
      : ['mcq']

  return c.json(
    await buildReadiness(plan._id, {
      allowedQuestionTypes,
      examHasReference,
      sharedExamCode: examCode,
      viewerAuthId: authUser.id,
    })
  )
})

// ── POST /:examCode/roadmap/generate — Generate study roadmap ───────────────

planRoutes.post('/:examCode/roadmap/generate', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode })
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const result = await generateAndPersistRoadmap(plan)
  if (!result.ok) return c.json({ error: result.error }, result.status)

  return c.json(result.days, 201)
})

// ── GET /:examCode/roadmap — Get study roadmap ──────────────────────────────

planRoutes.get('/:examCode/roadmap', async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  return c.json(await getEnrichedRoadmap(plan._id))
})

// ── PATCH /:examCode/roadmap/:dayNumber/complete — Mark a day complete ──────

planRoutes.patch('/:examCode/roadmap/:dayNumber/complete', async (c) => {
  const authUser = c.get('user')
  const { examCode, dayNumber } = c.req.param()

  const plan = await PlanModel.findOne({ authId: authUser.id, examCode }).lean()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const day = await completeRoadmapDay(plan._id, parseInt(dayNumber))
  if (!day) return c.json({ error: 'Roadmap day not found' }, 404)
  return c.json(day)
})

export default planRoutes
