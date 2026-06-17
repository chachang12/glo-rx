import { Hono } from 'hono'
import mongoose from 'mongoose'
import { requireAuth } from '../../../middleware/auth.js'
import { requireAdmin } from '../../../middleware/admin.js'
import type { AuthEnv } from '../../../types.js'
import { UserModel } from '../user/user.model.js'
import { PlanModel } from '../../learn/plan/plan.model.js'
import { SessionModel } from '../../learn/session/session.model.js'
import { ExamModel, OfficialTestModel, QuestionBankModel } from '../../learn/exam/exam.model.js'
import { TestModel } from '../../learn/test/test.model.js'
import { validateTest, validateQuestion, validateBulkQuestions } from '../../../config/schemas.js'
import { FLAGGED_QUESTION_THRESHOLD } from '../../../config/limits.js'

const baseAdminRoutes = new Hono<AuthEnv>()

baseAdminRoutes.use(requireAuth)
baseAdminRoutes.use(requireAdmin)

// ── Platform Stats ──────────────────────────────────────────────────────────

baseAdminRoutes.get('/stats', async (c) => {
  const [userCount, planCount, sessionCount, examCount] = await Promise.all([
    UserModel.countDocuments(),
    PlanModel.countDocuments(),
    SessionModel.countDocuments(),
    ExamModel.countDocuments(),
  ])

  return c.json({
    users: userCount,
    plans: planCount,
    sessions: sessionCount,
    exams: examCount,
  })
})

// ── User Management ─────────────────────────────────────────────────────────

baseAdminRoutes.get('/users', async (c) => {
  const users = await UserModel.find()
    .select('authId firstName lastName username role licenses createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return c.json(users)
})

const ALLOWED_ROLES = ['user', 'contributor', 'researcher', 'admin'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

baseAdminRoutes.patch('/users/:userId/role', async (c) => {
  const { userId } = c.req.param()
  const body = await c.req.json().catch(() => ({}))
  const role = body?.role

  if (!ALLOWED_ROLES.includes(role)) {
    return c.json(
      { error: `role must be one of ${ALLOWED_ROLES.join(', ')}` },
      400
    )
  }

  const user = await UserModel.findById(userId).select('authId role')
  if (!user) return c.json({ error: 'User not found' }, 404)

  const authUser = c.get('user')
  if (user.authId === authUser.id && (role as AllowedRole) !== 'admin') {
    return c.json({ error: 'Cannot demote your own admin account.' }, 400)
  }

  user.role = role
  // Setting role away from contributor leaves the embedded contributor doc
  // intact (scopes/rate history); re-granting later restores access without
  // re-inviting. Mirror this on researcher when its profile is added.
  await user.save()

  return c.json({ _id: String(user._id), role: user.role })
})

baseAdminRoutes.delete('/users/:userId', async (c) => {
  const { userId } = c.req.param()

  const user = await UserModel.findById(userId)
  if (!user) return c.json({ error: 'User not found' }, 404)

  // Don't allow deleting yourself
  const authUser = c.get('user')
  if (user.authId === authUser.id) {
    return c.json({ error: 'Cannot delete your own account from admin' }, 400)
  }

  // Clean up user data
  await Promise.all([
    PlanModel.deleteMany({ authId: user.authId }),
    SessionModel.deleteMany({ authId: user.authId }),
    UserModel.deleteOne({ _id: userId }),
  ])

  return c.json({ success: true })
})

// ── Exam Management ─────────────────────────────────────────────────────────

baseAdminRoutes.get('/exams', async (c) => {
  const exams = await ExamModel.find()
    .sort({ category: 1, label: 1 })
    .lean()

  return c.json(exams)
})

baseAdminRoutes.get('/exams/:code', async (c) => {
  const { code } = c.req.param()
  const exam = await ExamModel.findOne({ code }).lean()
  if (!exam) return c.json({ error: 'Exam not found' }, 404)
  return c.json(exam)
})

baseAdminRoutes.post('/exams', async (c) => {
  const body = await c.req.json()

  if (!body.code || !body.label || !body.category) {
    return c.json({ error: 'code, label, and category are required' }, 400)
  }

  const existing = await ExamModel.findOne({ code: body.code })
  if (existing) {
    return c.json({ error: 'Exam code already exists' }, 409)
  }

  const exam = await ExamModel.create({
    code: body.code,
    label: body.label,
    category: body.category,
    description: body.description ?? '',
    active: body.active ?? false,
    topics: body.topics ?? [],
    aiReferenceText: body.aiReferenceText ?? '',
  })

  return c.json(exam, 201)
})

baseAdminRoutes.patch('/exams/:code', async (c) => {
  const { code } = c.req.param()
  const body = await c.req.json()

  const allowed = [
    'label', 'category', 'description', 'active', 'visibility', 'featured',
    'topics', 'aiReferenceText', 'aiReferenceFileName',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Featured is mutually exclusive: setting one to true unfeatures the others.
  // Run this BEFORE the target update so a concurrent request can't leave two
  // featured at once.
  if (updates.featured === true) {
    await ExamModel.updateMany(
      { code: { $ne: code }, featured: true },
      { $set: { featured: false } },
    )
  }

  const exam = await ExamModel.findOneAndUpdate(
    { code },
    { $set: updates },
    { new: true },
  )

  if (!exam) return c.json({ error: 'Exam not found' }, 404)
  return c.json(exam)
})

baseAdminRoutes.delete('/exams/:code', async (c) => {
  const { code } = c.req.param()

  const exam = await ExamModel.findOneAndDelete({ code })
  if (!exam) return c.json({ error: 'Exam not found' }, 404)

  return c.json({ success: true })
})

// ── Exam Tests (admin can view all tests for an exam) ───────────────────────

baseAdminRoutes.get('/exams/:code/tests', async (c) => {
  const { code } = c.req.param()

  const tests = await TestModel.find({ examCode: code })
    .select('title questionCount tags isPublic timesPlayed createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return c.json(tests)
})

// ── Official Tests ──────────────────────────────────────────────────────────

baseAdminRoutes.get('/exams/:code/official-tests', async (c) => {
  const { code } = c.req.param()
  const tests = await OfficialTestModel.find({ examCode: code })
    .select('title description questionCount createdAt')
    .sort({ createdAt: -1 })
    .lean()
  return c.json(tests)
})

baseAdminRoutes.get('/official-tests/:testId', async (c) => {
  const { testId } = c.req.param()
  const test = await OfficialTestModel.findById(testId).lean()
  if (!test) return c.json({ error: 'Test not found' }, 404)
  return c.json(test)
})

baseAdminRoutes.post('/exams/:code/official-tests', async (c) => {
  const { code } = c.req.param()

  const examExists = await ExamModel.exists({ code })
  if (!examExists) return c.json({ error: 'Exam not found' }, 404)

  const body = await c.req.json()

  const validationError = validateTest(body)
  if (validationError) return c.json({ error: validationError }, 400)

  const test = await OfficialTestModel.create({
    examCode: code,
    title: body.title,
    description: body.description ?? '',
    timeLimit: body.timeLimit ?? null,
    questions: body.questions,
    questionCount: body.questions.length,
  })

  return c.json(test, 201)
})

baseAdminRoutes.delete('/official-tests/:testId', async (c) => {
  const { testId } = c.req.param()
  const test = await OfficialTestModel.findByIdAndDelete(testId)
  if (!test) return c.json({ error: 'Test not found' }, 404)
  return c.json({ success: true })
})

// ── Question Bank ───────────────────────────────────────────────────────────

baseAdminRoutes.get('/exams/:code/questions', async (c) => {
  const { code } = c.req.param()
  const q = c.req.query('q')?.trim() ?? ''
  const difficulty = c.req.query('difficulty')
  const topic = c.req.query('topic')
  const flagged = c.req.query('flagged')
  const cursor = c.req.query('cursor')
  const limitRaw = Number(c.req.query('limit') ?? '25')
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 25))

  const filter: Record<string, unknown> = { examCode: code }
  if (q) filter.stem = { $regex: escapeRegex(q), $options: 'i' }
  if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
    filter.difficulty = difficulty
  }
  if (topic) filter.topics = topic
  if (flagged === 'true') filter.reportCount = { $gt: 0 }
  else if (flagged === 'false') filter.reportCount = { $in: [0, null] }

  // Keyset paginate on _id desc (matches createdAt desc since ObjectIds embed time).
  const pageFilter: Record<string, unknown> = { ...filter }
  if (cursor && mongoose.isValidObjectId(cursor)) {
    pageFilter._id = { $lt: new mongoose.Types.ObjectId(cursor) }
  }

  const [items, total] = await Promise.all([
    QuestionBankModel.find(pageFilter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean(),
    QuestionBankModel.countDocuments(filter),
  ])

  const hasMore = items.length > limit
  const page = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null

  return c.json({ items: page, nextCursor, total })
})

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

baseAdminRoutes.post('/exams/:code/questions', async (c) => {
  const { code } = c.req.param()

  const examExists = await ExamModel.exists({ code })
  if (!examExists) return c.json({ error: 'Exam not found' }, 404)

  const body = await c.req.json()

  const validationError = validateQuestion(body)
  if (validationError) return c.json({ error: validationError }, 400)

  const question = await QuestionBankModel.create({
    examCode: code,
    type: body.type ?? 'mcq',
    stem: body.stem,
    options: body.options,
    answer: body.answer,
    explanation: body.explanation ?? '',
    topics: body.topics ?? [],
    difficulty: body.difficulty ?? null,
  })

  return c.json(question, 201)
})

baseAdminRoutes.post('/exams/:code/questions/bulk', async (c) => {
  const { code } = c.req.param()

  const examExists = await ExamModel.exists({ code })
  if (!examExists) return c.json({ error: 'Exam not found' }, 404)

  const body = await c.req.json()

  const validationError = validateBulkQuestions(body)
  if (validationError) return c.json({ error: validationError }, 400)

  const targetStatus = body.targetStatus ?? 'published'
  if (targetStatus !== 'published' && targetStatus !== 'pending') {
    return c.json({ error: "targetStatus must be 'published' or 'pending'" }, 400)
  }

  const docs = body.questions.map((q: Record<string, unknown>) => ({
    examCode: code,
    type: q.type ?? 'mcq',
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation ?? '',
    topics: (q.topics as string[]) ?? [],
    difficulty: q.difficulty ?? null,
    status: targetStatus,
  }))

  const created = await QuestionBankModel.insertMany(docs)
  return c.json({ count: created.length, status: targetStatus }, 201)
})

baseAdminRoutes.delete('/questions/:questionId', async (c) => {
  const { questionId } = c.req.param()
  const q = await QuestionBankModel.findByIdAndDelete(questionId)
  if (!q) return c.json({ error: 'Question not found' }, 404)
  return c.json({ success: true })
})

// ── Flagged Questions ───────────────────────────────────────────────────────

baseAdminRoutes.get('/flagged-questions', async (c) => {
  const threshold = FLAGGED_QUESTION_THRESHOLD

  // Flagged question bank items
  const bankQuestions = await QuestionBankModel.find({ reportCount: { $gte: threshold } })
    .sort({ reportCount: -1 })
    .lean()

  // Flagged embedded test questions
  const tests = await OfficialTestModel.find({
    'questions.reportCount': { $gte: threshold },
  }).lean()

  const testQuestions = tests.flatMap((test) =>
    test.questions
      .filter((q) => q.reportCount >= threshold)
      .map((q) => ({
        _id: q._id,
        testId: test._id,
        testTitle: test.title,
        examCode: test.examCode,
        type: q.type,
        stem: q.stem,
        reportCount: q.reportCount,
        source: 'official-test' as const,
      }))
  )

  const bankMapped = bankQuestions.map((q) => ({
    _id: q._id,
    testId: null,
    testTitle: null,
    examCode: q.examCode,
    type: q.type,
    stem: q.stem,
    reportCount: q.reportCount,
    source: 'question-bank' as const,
  }))

  return c.json([...bankMapped, ...testQuestions].sort((a, b) => b.reportCount - a.reportCount))
})

export default baseAdminRoutes

