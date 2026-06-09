import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import { requireAdmin } from '../../../middleware/admin.js'
import type { AuthEnv } from '../../../types.js'
import { CorpusVersionModel } from '../../learn/exam/corpus-version.model.js'
import { UserModel } from '../user/user.model.js'
import { AdminAuditLogModel } from './admin-audit-log.model.js'
import { loadCorpus } from '../../../scripts/load-corpus.js'

const corpusRoutes = new Hono<AuthEnv>()

corpusRoutes.use(requireAuth)
corpusRoutes.use(requireAdmin)

// GET /api/admin/corpus/:examCode — list loaded versions for an exam.
corpusRoutes.get('/:examCode', async (c) => {
  const { examCode } = c.req.param()
  const versions = await CorpusVersionModel.find({ examCode })
    .sort({ loadedAt: -1 })
    .lean()
  return c.json(versions)
})

// POST /api/admin/corpus/:examCode/load — re-run the loader for an exam.
// Hash mismatches throw from loadCorpus and bubble up as 500.
corpusRoutes.post('/:examCode/load', async (c) => {
  const { examCode } = c.req.param()
  const authUser = c.get('user')

  let result
  try {
    result = await loadCorpus(examCode)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400)
  }

  const adminUser = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (adminUser) {
    await AdminAuditLogModel.create({
      actorUserId: adminUser._id,
      action: 'corpus.load',
      target: { kind: 'corpus', examCode, version: result.corpusVersion },
      payload: { filesLoaded: result.filesLoaded, skipped: result.skipped },
    })
  }

  return c.json(result)
})

export default corpusRoutes
