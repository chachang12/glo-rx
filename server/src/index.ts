import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectDB } from './config/db.js'
import { auth } from './lib/auth.js'
// Shared
import { userRoutes } from './features/shared/user/index.js'
import { friendshipRoutes } from './features/shared/friendship/index.js'
import { adminRoutes } from './features/shared/admin/index.js'

// Learn
import { abgRoutes } from './features/learn/abg/index.js'
import { examRoutes } from './features/learn/exam/index.js'
import { sessionRoutes } from './features/learn/session/index.js'
import { planRoutes } from './features/learn/plan/index.js'
import { testRoutes } from './features/learn/test/index.js'
import { flashcardRoutes } from './features/learn/flashcard/index.js'
import { customPlanRoutes } from './features/learn/custom-plan/index.js'

// Collect
import { ebayDeletionRoutes } from './features/collect/ebay-deletion/index.js'
import { collectRoutes } from './features/collect/index.js'
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

// Shared routes
app.route('/api/admin', adminRoutes)
app.route('/api/friends', friendshipRoutes)
app.route('/api/user', userRoutes)

// Learn routes
app.route('/api/abg', abgRoutes)
app.route('/api/exams', examRoutes)
app.route('/api/flashcards', flashcardRoutes)
app.route('/api/plans', planRoutes)
app.route('/api/custom-plans', customPlanRoutes)
app.route('/api/sessions', sessionRoutes)
app.route('/api/tests', testRoutes)

// Collect routes
app.route('/api/ebay-deletion', ebayDeletionRoutes)
app.route('/api/collect', collectRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

connectDB().then(async () => {
  await seedExams()
  serve({ fetch: app.fetch, port: 3001 }, () => {
    console.log('Server running on http://localhost:3001')
  })
})
