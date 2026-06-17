import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import { requireResearcher } from '../../../middleware/researcher.js'
import type { AuthEnv } from '../../../types.js'
import { ExamModel } from '../../learn/exam/exam.model.js'

const researcherRoutes = new Hono<AuthEnv>()

researcherRoutes.use('*', requireAuth, requireResearcher)

// GET /api/researcher/exams — list every exam with its topics. The public
// /api/exams endpoints strip topics; researchers need them to know what to
// upload reference material against.
researcherRoutes.get('/exams', async (c) => {
  const exams = await ExamModel.find()
    .select('code label category description active visibility featured topics')
    .sort({ category: 1, label: 1 })
    .lean()
  return c.json(exams)
})

export default researcherRoutes
