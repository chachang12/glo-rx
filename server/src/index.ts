import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectDB } from './config/db.js'
import { auth } from './lib/auth.js'
import { isOfficialPlanProgramPhaseAtLeast } from './config/feature-flags.js'
import { registerJob, startJobs } from './lib/scheduler.js'
// Shared
import { userRoutes } from './features/shared/user/index.js'
import { friendshipRoutes } from './features/shared/friendship/index.js'
import { adminRoutes } from './features/shared/admin/index.js'
import { contributorFeatureRoutes } from './features/shared/contributor/index.js'
import { researcherRoutes } from './features/shared/researcher/index.js'
import { billingRoutes } from './features/billing/index.js'
import { recomputeAllReliabilityScores } from './features/shared/contributor/reliability-score.service.js'

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
import { startScheduler, notifyHandoff, setAbandonHandler } from './features/collect/watch/index.js'
import { loadCallStatsFromDB } from './features/collect/ebay/ebay.client.js'
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
if (isOfficialPlanProgramPhaseAtLeast(2)) {
  app.route('/api/contributor', contributorFeatureRoutes)
}
app.route('/api/researcher', researcherRoutes)
app.route('/api/billing', billingRoutes)

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

function warnIfMissingEbayCreds() {
  const missing = (['EBAY_APP_ID', 'EBAY_CERT_ID'] as const).filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(
      `[collect/ebay] ${missing.join(', ')} not set — /api/collect/ebay/* will return 500 until configured.`
    )
  }
  if (!process.env.EBAY_EPN_CAMPAIGN_ID) {
    console.warn(
      '[collect/ebay] EBAY_EPN_CAMPAIGN_ID not set — itemAffiliateWebUrl will be absent from responses (no commission).'
    )
  }
}

function warnIfMissingTelegramCreds() {
  const missing = (['TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME', 'TELEGRAM_WEBHOOK_SECRET'] as const).filter(
    (k) => !process.env[k]
  )
  if (missing.length > 0) {
    console.warn(
      `[collect/telegram] ${missing.join(', ')} not set — Telegram notifications disabled until configured.`
    )
  }
}

function warnIfMissingStripeCreds() {
  const missing = (
    [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_PRO_MONTHLY',
      'STRIPE_PRICE_PRO_ANNUAL',
      'STRIPE_PRICE_PRO_LIFETIME',
    ] as const
  ).filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(
      `[billing/stripe] ${missing.join(', ')} not set — /api/billing/* will fail until configured.`
    )
  }
}

connectDB().then(async () => {
  await seedExams()
  warnIfMissingEbayCreds()
  warnIfMissingTelegramCreds()
  warnIfMissingStripeCreds()
  await loadCallStatsFromDB()
  setAbandonHandler(notifyHandoff)
  if (process.env.EBAY_APP_ID && process.env.EBAY_CERT_ID) {
    startScheduler()
  } else {
    console.warn('[scheduler] not started — eBay credentials missing')
  }
  if (isOfficialPlanProgramPhaseAtLeast(2)) {
    // Nightly reliability recompute. setInterval cadence — every 24h from
    // process start. Drift is acceptable here; cron would be over-engineering.
    registerJob('contributor.reliabilityScore', 24 * 60 * 60 * 1000, async () => {
      const { updated } = await recomputeAllReliabilityScores()
      console.log(`[scheduler] reliability score recompute: updated ${updated}`)
    })
    startJobs()
  }
  serve({ fetch: app.fetch, port: 3001 }, () => {
    console.log('Server running on http://localhost:3001')
  })
})
