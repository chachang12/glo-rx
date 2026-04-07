import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { TestModel } from './test.model.js'
import { EXAM_CODES } from '../../config/exams.js'

const testRoutes = new Hono<AuthEnv>()

testRoutes.use(requireAuth)

// POST /api/tests — upload a new test
testRoutes.post('/', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json()

  if (!body.examCode || !EXAM_CODES.includes(body.examCode)) {
    return c.json({ error: 'Invalid exam code' }, 400)
  }

  if (!body.questions?.length) {
    return c.json({ error: 'Questions are required' }, 400)
  }

  // Derive tags from sources if not provided
  const tags: string[] = body.tags ?? (body.sources ?? []).map((s: string) =>
    s.replace(/[_-]/g, ' ').replace(/\.(txt|json|pdf)$/i, '').toLowerCase()
  )

  const test = await TestModel.create({
    createdBy: authUser.id,
    examCode: body.examCode,
    title: body.title ?? 'Untitled Test',
    description: body.description ?? '',
    tags,
    sources: body.sources ?? [],
    questionCount: body.questions.length,
    isPublic: body.isPublic ?? true,
    questions: body.questions,
  })

  return c.json(test, 201)
})

// GET /api/tests — list community tests, filterable by examCode and tags
testRoutes.get('/', async (c) => {
  const examCode = c.req.query('examCode')
  const tag = c.req.query('tag')
  const search = c.req.query('search')
  const limit = Number(c.req.query('limit') ?? 20)
  const offset = Number(c.req.query('offset') ?? 0)

  const filter: Record<string, unknown> = { isPublic: true }

  if (examCode) filter.examCode = examCode
  if (tag) filter.tags = tag
  if (search) filter.$text = { $search: search }

  const [tests, total] = await Promise.all([
    TestModel.find(filter)
      .select('-questions')
      .sort({ timesPlayed: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    TestModel.countDocuments(filter),
  ])

  return c.json({ tests, total })
})

// GET /api/tests/mine — list tests created by the current user
testRoutes.get('/mine', async (c) => {
  const authUser = c.get('user')

  const tests = await TestModel.find({ createdBy: authUser.id })
    .select('-questions')
    .sort({ createdAt: -1 })
    .lean()

  return c.json(tests)
})

// GET /api/tests/:id — get a full test with questions
testRoutes.get('/:id', async (c) => {
  const { id } = c.req.param()

  const test = await TestModel.findById(id).lean()

  if (!test) {
    return c.json({ error: 'Test not found' }, 404)
  }

  // Increment play count
  await TestModel.updateOne({ _id: id }, { $inc: { timesPlayed: 1 } })

  return c.json(test)
})

export default testRoutes
