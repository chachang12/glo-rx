import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import { requireAdmin } from '../../middleware/admin.js'
import type { AuthEnv } from '../../types.js'
import { UserModel } from '../user/user.model.js'
import { PlanModel } from '../plan/plan.model.js'
import { SessionModel } from '../session/session.model.js'
import { ExamModel, OfficialTestModel, QuestionBankModel } from '../exam/exam.model.js'
import { TestModel } from '../test/test.model.js'
import { validateTest, validateQuestion, validateBulkQuestions } from '../../config/schemas.js'

const adminRoutes = new Hono<AuthEnv>()

adminRoutes.use(requireAuth)
adminRoutes.use(requireAdmin)

// ── Platform Stats ──────────────────────────────────────────────────────────

adminRoutes.get('/stats', async (c) => {
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

adminRoutes.get('/users', async (c) => {
  const users = await UserModel.find()
    .select('authId firstName lastName username role licenses createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return c.json(users)
})

adminRoutes.delete('/users/:userId', async (c) => {
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

adminRoutes.get('/exams', async (c) => {
  const exams = await ExamModel.find()
    .sort({ category: 1, label: 1 })
    .lean()

  return c.json(exams)
})

adminRoutes.get('/exams/:code', async (c) => {
  const { code } = c.req.param()
  const exam = await ExamModel.findOne({ code }).lean()
  if (!exam) return c.json({ error: 'Exam not found' }, 404)
  return c.json(exam)
})

adminRoutes.post('/exams', async (c) => {
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

adminRoutes.patch('/exams/:code', async (c) => {
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

adminRoutes.delete('/exams/:code', async (c) => {
  const { code } = c.req.param()

  const exam = await ExamModel.findOneAndDelete({ code })
  if (!exam) return c.json({ error: 'Exam not found' }, 404)

  return c.json({ success: true })
})

// ── Exam Tests (admin can view all tests for an exam) ───────────────────────

adminRoutes.get('/exams/:code/tests', async (c) => {
  const { code } = c.req.param()

  const tests = await TestModel.find({ examCode: code })
    .select('title questionCount tags isPublic timesPlayed createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return c.json(tests)
})

// ── Official Tests ──────────────────────────────────────────────────────────

adminRoutes.get('/exams/:code/official-tests', async (c) => {
  const { code } = c.req.param()
  const tests = await OfficialTestModel.find({ examCode: code })
    .select('title description questionCount createdAt')
    .sort({ createdAt: -1 })
    .lean()
  return c.json(tests)
})

adminRoutes.get('/official-tests/:testId', async (c) => {
  const { testId } = c.req.param()
  const test = await OfficialTestModel.findById(testId).lean()
  if (!test) return c.json({ error: 'Test not found' }, 404)
  return c.json(test)
})

adminRoutes.post('/exams/:code/official-tests', async (c) => {
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

adminRoutes.delete('/official-tests/:testId', async (c) => {
  const { testId } = c.req.param()
  const test = await OfficialTestModel.findByIdAndDelete(testId)
  if (!test) return c.json({ error: 'Test not found' }, 404)
  return c.json({ success: true })
})

// ── Question Bank ───────────────────────────────────────────────────────────

adminRoutes.get('/exams/:code/questions', async (c) => {
  const { code } = c.req.param()
  const questions = await QuestionBankModel.find({ examCode: code })
    .sort({ createdAt: -1 })
    .lean()
  return c.json(questions)
})

adminRoutes.post('/exams/:code/questions', async (c) => {
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

adminRoutes.post('/exams/:code/questions/bulk', async (c) => {
  const { code } = c.req.param()

  const examExists = await ExamModel.exists({ code })
  if (!examExists) return c.json({ error: 'Exam not found' }, 404)

  const body = await c.req.json()

  const validationError = validateBulkQuestions(body)
  if (validationError) return c.json({ error: validationError }, 400)

  const docs = body.questions.map((q: Record<string, unknown>) => ({
    examCode: code,
    type: q.type ?? 'mcq',
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation ?? '',
    topics: (q.topics as string[]) ?? [],
    difficulty: q.difficulty ?? null,
  }))

  const created = await QuestionBankModel.insertMany(docs)
  return c.json({ count: created.length }, 201)
})

adminRoutes.delete('/questions/:questionId', async (c) => {
  const { questionId } = c.req.param()
  const q = await QuestionBankModel.findByIdAndDelete(questionId)
  if (!q) return c.json({ error: 'Question not found' }, 404)
  return c.json({ success: true })
})

// ── Flagged Questions ───────────────────────────────────────────────────────

adminRoutes.get('/flagged-questions', async (c) => {
  const threshold = 5

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

export default adminRoutes
