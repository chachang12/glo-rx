import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectDB } from './config/db.js'
import { auth } from './lib/auth.js'
import { abgRoutes } from './features/abg/index.js'
import { userRoutes } from './features/user/index.js'
import { examRoutes } from './features/exam/index.js'
import { sessionRoutes } from './features/session/index.js'
import { planRoutes } from './features/plan/index.js'
import { testRoutes } from './features/test/index.js'
import { flashcardRoutes } from './features/flashcard/index.js'
import { friendshipRoutes } from './features/friendship/index.js'
import { customPlanRoutes } from './features/custom-plan/index.js'
import { adminRoutes } from './features/admin/index.js'
import { seedExams } from './config/exams.js'

const app = new Hono()

app.use(
  '/api/*',
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    exposeHeaders: ['Set-Cookie'],
  })
)

// Auth routes — Better Auth handles all /api/auth/* automatically
app.all('/api/auth/*', (c) => auth.handler(c.req.raw))

// Feature routes
app.route('/api/admin', adminRoutes)
app.route('/api/abg', abgRoutes)
app.route('/api/exams', examRoutes)
app.route('/api/flashcards', flashcardRoutes)
app.route('/api/friends', friendshipRoutes)
app.route('/api/plans', planRoutes)
app.route('/api/custom-plans', customPlanRoutes)
app.route('/api/sessions', sessionRoutes)
app.route('/api/tests', testRoutes)
app.route('/api/user', userRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

connectDB().then(async () => {
  await seedExams()
  serve({ fetch: app.fetch, port: 3001 }, () => {
    console.log('Server running on http://localhost:3001')
  })
})
