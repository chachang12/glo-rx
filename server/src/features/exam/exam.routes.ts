import { Hono } from 'hono'
import { EXAMS } from '../../config/exams.js'

const examRoutes = new Hono()

// GET /api/exams — returns active exams only
examRoutes.get('/', (c) => {
  const active = EXAMS.filter((e) => e.active)
  return c.json(active)
})

// GET /api/exams/all — returns all exams (for admin use later)
examRoutes.get('/all', (c) => {
  return c.json(EXAMS)
})

export default examRoutes
