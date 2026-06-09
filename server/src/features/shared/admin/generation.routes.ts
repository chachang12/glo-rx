import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import { requireAdmin } from '../../../middleware/admin.js'
import type { AuthEnv } from '../../../types.js'
import { ExamModel, QuestionBankModel } from '../../learn/exam/exam.model.js'
import { UserModel } from '../user/user.model.js'
import { AdminAuditLogModel } from './admin-audit-log.model.js'
import {
  generateOfficialQuestions,
  OfficialGenerationError,
} from '../../learn/generation/generate-official-questions.service.js'

const generationRoutes = new Hono<AuthEnv>()

generationRoutes.use(requireAuth)
generationRoutes.use(requireAdmin)

// GET /api/admin/exams/:examCode/topics — flat Exam.topics list.
generationRoutes.get('/exams/:examCode/topics', async (c) => {
  const { examCode } = c.req.param()
  const exam = await ExamModel.findOne({ code: examCode }).select('topics').lean()
  if (!exam) return c.json({ error: 'Exam not found' }, 404)
  return c.json(exam.topics ?? [])
})

// POST /api/admin/generation/:examCode/batch — generate a batch of draft questions.
generationRoutes.post('/generation/:examCode/batch', async (c) => {
  const { examCode } = c.req.param()
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => ({}))

  const corpusVersion = body.corpusVersion
  const topicLabel = body.topicLabel
  if (typeof corpusVersion !== 'string' || !corpusVersion.trim()) {
    return c.json({ error: 'corpusVersion is required' }, 400)
  }
  if (typeof topicLabel !== 'string' || !topicLabel.trim()) {
    return c.json({ error: 'topicLabel is required' }, 400)
  }

  try {
    const result = await generateOfficialQuestions({
      examCode,
      corpusVersion: corpusVersion.trim(),
      topicLabel: topicLabel.trim(),
      count: body.count,
      allowedTypes: body.allowedTypes,
      typeWeights: body.typeWeights,
      difficulty: body.difficulty,
      customInstructions: body.customInstructions,
    })

    const adminUser = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
    if (adminUser) {
      await AdminAuditLogModel.create({
        actorUserId: adminUser._id,
        action: 'generation.batch',
        target: { kind: 'generation', examCode, corpusVersion, topicLabel },
        payload: {
          count: body.count,
          generatedCount: result.generatedCount,
          attempted: result.attempted,
          droppedCount: result.droppedCount,
          difficulty: body.difficulty,
        },
      })
    }

    return c.json(result)
  } catch (err) {
    if (err instanceof OfficialGenerationError) {
      return c.json({ error: err.message }, err.status as 400 | 404 | 409 | 502)
    }
    console.error('[admin/generation] failed:', err)
    return c.json({ error: 'Question generation failed. Please try again.' }, 500)
  }
})

// POST /api/admin/questions/promote — bulk transition draft → pending.
generationRoutes.post('/questions/promote', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => ({}))

  if (!Array.isArray(body.questionIds) || body.questionIds.length === 0) {
    return c.json({ error: 'questionIds (non-empty array) is required' }, 400)
  }
  if (!body.questionIds.every((id: unknown) => typeof id === 'string')) {
    return c.json({ error: 'questionIds must all be strings' }, 400)
  }

  const result = await QuestionBankModel.updateMany(
    { _id: { $in: body.questionIds }, status: 'draft' },
    { $set: { status: 'pending' } }
  )

  const adminUser = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (adminUser) {
    await AdminAuditLogModel.create({
      actorUserId: adminUser._id,
      action: 'questions.promote',
      target: { kind: 'questions', ids: body.questionIds },
      payload: { matched: result.matchedCount, modified: result.modifiedCount },
    })
  }

  return c.json({
    matched: result.matchedCount,
    promoted: result.modifiedCount,
  })
})

export default generationRoutes
