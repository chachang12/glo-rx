import { Hono } from 'hono'
import mongoose from 'mongoose'
import { requireAuth } from '../../../middleware/auth.js'
import { requireAdmin } from '../../../middleware/admin.js'
import type { AuthEnv } from '../../../types.js'
import { ExamModel, QuestionBankModel } from '../../learn/exam/exam.model.js'
import { ReleaseModel } from '../../learn/exam/release.model.js'
import { UserModel } from '../user/user.model.js'
import { AdminAuditLogModel } from './admin-audit-log.model.js'

const releasesRoutes = new Hono<AuthEnv>()

releasesRoutes.use(requireAuth)
releasesRoutes.use(requireAdmin)

// GET /api/admin/releases/:examCode — list releases for an exam, newest first.
releasesRoutes.get('/:examCode', async (c) => {
  const { examCode } = c.req.param()
  const releases = await ReleaseModel.find({ examCode })
    .sort({ createdAt: -1 })
    .lean()
  return c.json(releases)
})

// GET /api/admin/releases/:examCode/candidates — approved questions eligible
// for inclusion in a new release. Excludes anything already attached to a
// live release (drafts/archived stay eligible — multiple drafts can reference
// the same approved question, but publish enforces single-release ownership).
releasesRoutes.get('/:examCode/candidates', async (c) => {
  const { examCode } = c.req.param()
  const questions = await QuestionBankModel.find({
    examCode,
    status: 'approved',
    releaseId: null,
  })
    .select('_id stem type topics difficulty approvalCount createdAt')
    .sort({ createdAt: -1 })
    .lean()
  return c.json(questions)
})

// POST /api/admin/releases — create a new draft release.
releasesRoutes.post('/', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => ({}))

  const examCode = typeof body.examCode === 'string' ? body.examCode.trim() : ''
  const version = typeof body.version === 'string' ? body.version.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes : ''
  const corpusVersion =
    typeof body.corpusVersion === 'string' && body.corpusVersion.trim()
      ? body.corpusVersion.trim()
      : null

  if (!examCode) return c.json({ error: 'examCode is required' }, 400)
  if (!version) return c.json({ error: 'version is required' }, 400)
  if (!name) return c.json({ error: 'name is required' }, 400)

  if (!Array.isArray(body.questionIds) || body.questionIds.length === 0) {
    return c.json({ error: 'questionIds (non-empty array) is required' }, 400)
  }
  if (!body.questionIds.every((id: unknown) => typeof id === 'string')) {
    return c.json({ error: 'questionIds must all be strings' }, 400)
  }

  const examExists = await ExamModel.exists({ code: examCode })
  if (!examExists) return c.json({ error: `Exam ${examCode} not found` }, 404)

  const duplicate = await ReleaseModel.exists({ examCode, version })
  if (duplicate) {
    return c.json(
      { error: `Release ${version} already exists for ${examCode}` },
      409
    )
  }

  // Every question must be approved and unassigned.
  const candidates = await QuestionBankModel.find({
    _id: { $in: body.questionIds },
    examCode,
    status: 'approved',
    releaseId: null,
  })
    .select('_id')
    .lean()
  if (candidates.length !== body.questionIds.length) {
    return c.json(
      {
        error: 'Some questions are not approved, already in a release, or do not belong to this exam',
        matched: candidates.length,
        requested: body.questionIds.length,
      },
      400
    )
  }

  const release = await ReleaseModel.create({
    examCode,
    version,
    name,
    notes,
    status: 'draft',
    questionIds: candidates.map((q) => q._id),
    corpusVersion,
  })

  const admin = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (admin) {
    await AdminAuditLogModel.create({
      actorUserId: admin._id,
      action: 'release.create',
      target: { kind: 'release', id: String(release._id), examCode, version },
      payload: { name, questionCount: candidates.length, corpusVersion },
    })
  }

  return c.json(release, 201)
})

// POST /api/admin/releases/:id/publish — transition draft → live and bulk
// stamp approved → published on the included questions.
releasesRoutes.post('/:id/publish', async (c) => {
  const { id } = c.req.param()
  const authUser = c.get('user')

  if (!mongoose.isValidObjectId(id)) {
    return c.json({ error: 'Invalid release id' }, 400)
  }

  const release = await ReleaseModel.findById(id)
  if (!release) return c.json({ error: 'Release not found' }, 404)
  if (release.status !== 'draft') {
    return c.json(
      { error: `Release is ${release.status}; only drafts can be published` },
      409
    )
  }

  const admin = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (!admin) return c.json({ error: 'Admin user not found' }, 404)

  const now = new Date()
  // Only stamp questions that are still approved + unassigned. If a question
  // drifted away (got rejected, attached to another release) we skip it rather
  // than overwrite — the discrepancy surfaces in the response.
  const updateResult = await QuestionBankModel.updateMany(
    {
      _id: { $in: release.questionIds },
      status: 'approved',
      releaseId: null,
    },
    {
      $set: {
        status: 'published',
        releaseId: release._id,
        publishedAt: now,
      },
    }
  )

  release.status = 'live'
  release.publishedBy = admin._id
  release.publishedAt = now
  await release.save()

  await AdminAuditLogModel.create({
    actorUserId: admin._id,
    action: 'release.publish',
    target: {
      kind: 'release',
      id: String(release._id),
      examCode: release.examCode,
      version: release.version,
    },
    payload: {
      questionCount: release.questionIds.length,
      stamped: updateResult.modifiedCount,
      skipped: release.questionIds.length - updateResult.modifiedCount,
    },
  })

  return c.json({
    release,
    stamped: updateResult.modifiedCount,
    skipped: release.questionIds.length - updateResult.modifiedCount,
  })
})

// POST /api/admin/releases/:id/archive — revert live → archived; flip the
// included questions back to approved + clear releaseId so they stop serving.
releasesRoutes.post('/:id/archive', async (c) => {
  const { id } = c.req.param()
  const authUser = c.get('user')

  if (!mongoose.isValidObjectId(id)) {
    return c.json({ error: 'Invalid release id' }, 400)
  }

  const release = await ReleaseModel.findById(id)
  if (!release) return c.json({ error: 'Release not found' }, 404)
  if (release.status !== 'live') {
    return c.json(
      { error: `Release is ${release.status}; only live releases can be archived` },
      409
    )
  }

  const admin = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (!admin) return c.json({ error: 'Admin user not found' }, 404)

  const now = new Date()
  const updateResult = await QuestionBankModel.updateMany(
    { releaseId: release._id, status: 'published' },
    {
      $set: {
        status: 'approved',
        releaseId: null,
        publishedAt: null,
      },
    }
  )

  release.status = 'archived'
  release.archivedBy = admin._id
  release.archivedAt = now
  await release.save()

  await AdminAuditLogModel.create({
    actorUserId: admin._id,
    action: 'release.archive',
    target: {
      kind: 'release',
      id: String(release._id),
      examCode: release.examCode,
      version: release.version,
    },
    payload: { reverted: updateResult.modifiedCount },
  })

  return c.json({
    release,
    reverted: updateResult.modifiedCount,
  })
})

export default releasesRoutes
