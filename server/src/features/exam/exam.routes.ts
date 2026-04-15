import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { ExamModel, OfficialTestModel, QuestionBankModel, QuestionExposureModel } from './exam.model.js'

const examRoutes = new Hono<AuthEnv>()

// GET /api/exams — returns visible exams (live + coming-soon) for marketplace
examRoutes.get('/', async (c) => {
  const exams = await ExamModel.find({ visibility: { $in: ['live', 'coming-soon'] } })
    .select('code label category description active visibility')
    .sort({ category: 1, label: 1 })
    .lean()
  return c.json(exams)
})

// GET /api/exams/all — returns all exams (for plan detail lookups)
examRoutes.get('/all', async (c) => {
  const exams = await ExamModel.find()
    .select('code label category description active visibility')
    .sort({ category: 1, label: 1 })
    .lean()
  return c.json(exams)
})

// ── Official Tests (auth required) ──────────────────────────────────────────

// GET /api/exams/:code/official-tests — list official tests for an exam
examRoutes.get('/:code/official-tests', requireAuth, async (c) => {
  const { code } = c.req.param()
  const tests = await OfficialTestModel.find({ examCode: code })
    .select('title description questionCount createdAt')
    .sort({ createdAt: -1 })
    .lean()
  return c.json(tests)
})

// GET /api/exams/official-tests/:testId — get a full official test
examRoutes.get('/official-tests/:testId', requireAuth, async (c) => {
  const { testId } = c.req.param()
  const test = await OfficialTestModel.findById(testId).lean()
  if (!test) return c.json({ error: 'Test not found' }, 404)
  return c.json(test)
})

// ── Question Bank (auth required) ───────────────────────────────────────────

// GET /api/exams/:code/questions — list question bank items (smart ordering)
examRoutes.get('/:code/questions', requireAuth, async (c) => {
  const authUser = c.get('user')
  const { code } = c.req.param()
  const { topic, limit } = c.req.query()
  const maxResults = limit ? parseInt(limit) : 50

  const filter: Record<string, unknown> = { examCode: code }
  if (topic) filter.topics = topic

  // Get all candidate questions
  const allQuestions = await QuestionBankModel.find(filter).lean()

  // Get user's exposure history for these questions
  const questionIds = allQuestions.map((q) => String(q._id))
  const exposures = await QuestionExposureModel.find({
    authId: authUser.id,
    questionId: { $in: questionIds },
  }).lean()

  // Build exposure map: questionId -> { count, lastSeen }
  const exposureMap = new Map<string, { count: number; lastSeen: Date }>()
  for (const exp of exposures) {
    const existing = exposureMap.get(exp.questionId)
    if (!existing) {
      exposureMap.set(exp.questionId, { count: 1, lastSeen: exp.seenAt })
    } else {
      existing.count++
      if (exp.seenAt > existing.lastSeen) existing.lastSeen = exp.seenAt
    }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

  // Sort: unseen first, then least-recently-seen, then least-seen
  const sorted = allQuestions.sort((a, b) => {
    const expA = exposureMap.get(String(a._id))
    const expB = exposureMap.get(String(b._id))

    // Unseen questions first
    if (!expA && expB) return -1
    if (expA && !expB) return 1
    if (!expA && !expB) return 0

    // Deprioritize recently seen (within 7 days)
    const recentA = expA!.lastSeen > sevenDaysAgo
    const recentB = expB!.lastSeen > sevenDaysAgo
    if (!recentA && recentB) return -1
    if (recentA && !recentB) return 1

    // Least seen overall
    if (expA!.count !== expB!.count) return expA!.count - expB!.count

    // Oldest seen first
    return expA!.lastSeen.getTime() - expB!.lastSeen.getTime()
  })

  return c.json(sorted.slice(0, maxResults))
})

// ── Exposure Tracking ───────────────────────────────────────────────────────

// POST /api/exams/exposure — record that a user saw questions
examRoutes.post('/exposure', requireAuth, async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json()

  if (!Array.isArray(body.questionIds) || body.questionIds.length === 0) {
    return c.json({ error: 'questionIds array is required' }, 400)
  }

  const docs = body.questionIds.map((qId: string) => ({
    authId: authUser.id,
    questionId: qId,
    seenAt: new Date(),
    answered: false,
  }))

  await QuestionExposureModel.insertMany(docs)
  return c.json({ recorded: docs.length })
})

// POST /api/exams/exposure/answer — record that a user answered a question
examRoutes.post('/exposure/answer', requireAuth, async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json()

  if (!body.questionId || typeof body.correct !== 'boolean') {
    return c.json({ error: 'questionId and correct (boolean) are required' }, 400)
  }

  // Update the most recent exposure for this question, or create one
  const updated = await QuestionExposureModel.findOneAndUpdate(
    { authId: authUser.id, questionId: body.questionId, answered: false },
    { $set: { answered: true, correct: body.correct } },
    { sort: { seenAt: -1 }, new: true }
  )

  if (!updated) {
    // No unseen exposure — create a new one
    await QuestionExposureModel.create({
      authId: authUser.id,
      questionId: body.questionId,
      answered: true,
      correct: body.correct,
    })
  }

  return c.json({ success: true })
})

// GET /api/exams/exposure/stats — get user's question exposure stats
examRoutes.get('/exposure/stats', requireAuth, async (c) => {
  const authUser = c.get('user')
  const { examCode } = c.req.query()

  // Get all question IDs for the exam
  const filter: Record<string, unknown> = {}
  if (examCode) {
    const questions = await QuestionBankModel.find({ examCode }).select('_id').lean()
    const ids = questions.map((q) => String(q._id))
    filter.questionId = { $in: ids }
  }

  const [totalSeen, totalAnswered, totalCorrect] = await Promise.all([
    QuestionExposureModel.countDocuments({ authId: authUser.id, ...filter }),
    QuestionExposureModel.countDocuments({ authId: authUser.id, answered: true, ...filter }),
    QuestionExposureModel.countDocuments({ authId: authUser.id, correct: true, ...filter }),
  ])

  return c.json({ totalSeen, totalAnswered, totalCorrect })
})

// ── Report a question ───────────────────────────────────────────────────────

// POST /api/exams/questions/:questionId/report — report a question bank item
examRoutes.post('/questions/:questionId/report', requireAuth, async (c) => {
  const authUser = c.get('user')
  const { questionId } = c.req.param()

  const question = await QuestionBankModel.findById(questionId)
  if (!question) return c.json({ error: 'Question not found' }, 404)

  if (question.reportedBy.includes(authUser.id)) {
    return c.json({ error: 'Already reported' }, 409)
  }

  question.reportedBy.push(authUser.id)
  question.reportCount += 1
  await question.save()

  return c.json({ reportCount: question.reportCount })
})

// POST /api/exams/official-tests/:testId/questions/:questionId/report — report an embedded test question
examRoutes.post('/official-tests/:testId/questions/:questionId/report', requireAuth, async (c) => {
  const authUser = c.get('user')
  const { testId, questionId } = c.req.param()

  const test = await OfficialTestModel.findById(testId)
  if (!test) return c.json({ error: 'Test not found' }, 404)

  const question = test.questions.id(questionId)
  if (!question) return c.json({ error: 'Question not found' }, 404)

  if (question.reportedBy.includes(authUser.id)) {
    return c.json({ error: 'Already reported' }, 409)
  }

  question.reportedBy.push(authUser.id)
  question.reportCount += 1
  await test.save()

  return c.json({ reportCount: question.reportCount })
})

export default examRoutes
