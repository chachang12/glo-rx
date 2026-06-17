import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { requireAuth } from '../../../middleware/auth.js'
import type { AuthEnv } from '../../../types.js'
import type { SearchFilters } from '../ebay/ebay.types.js'
import {
  asStringArray,
  validConditions,
  validBuyingOptions,
  validSort,
} from '../ebay/ebay.filters.js'
import { WatchMatchModel, WatchModel } from './watch.model.js'
import { subscribe } from './watch.sse-registry.js'
import { UserModel } from '../../shared/user/user.model.js'
import { ADVANCED_MAX_WATCHES_PER_USER } from '../advanced/index.js'

const NOTIFY_MODES = ['sse_only', 'telegram_only', 'both'] as const
const STATUSES = ['active', 'paused', 'rate_limited', 'error'] as const

function maxPerUser(advanced: boolean): number {
  if (advanced) return ADVANCED_MAX_WATCHES_PER_USER
  const v = Number(process.env.WATCH_MAX_PER_USER)
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 1
}
function maxGlobal(): number {
  const v = Number(process.env.WATCH_MAX_GLOBAL)
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 10
}

function defaultWatchName(filters: SearchFilters): string {
  if (filters.q) {
    const q = filters.q.trim()
    return q.length > 50 ? `${q.slice(0, 47)}…` : q
  }
  if (filters.categoryId) return `Category ${filters.categoryId}`
  return 'Untitled watch'
}

function coerceFilters(raw: unknown): SearchFilters | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>

  const conditions = validConditions(asStringArray(r.conditions))
  const buyingOptions = validBuyingOptions(asStringArray(r.buyingOptions))
  const sort = validSort(r.sort)

  let aspects: Record<string, string[]> | undefined
  if (r.aspects && typeof r.aspects === 'object' && !Array.isArray(r.aspects)) {
    aspects = {}
    for (const [k, v] of Object.entries(r.aspects)) {
      const arr = asStringArray(v)
      if (arr) aspects[k] = arr
    }
    if (Object.keys(aspects).length === 0) aspects = undefined
  }

  return {
    q: typeof r.q === 'string' ? r.q : undefined,
    categoryId: typeof r.categoryId === 'string' ? r.categoryId : undefined,
    priceMin: typeof r.priceMin === 'number' ? r.priceMin : undefined,
    priceMax: typeof r.priceMax === 'number' ? r.priceMax : undefined,
    priceCurrency: typeof r.priceCurrency === 'string' ? r.priceCurrency : undefined,
    conditions,
    conditionIds: asStringArray(r.conditionIds),
    buyingOptions,
    sellers: asStringArray(r.sellers),
    excludeSellers: asStringArray(r.excludeSellers),
    itemLocationCountry: typeof r.itemLocationCountry === 'string' ? r.itemLocationCountry : undefined,
    maxDeliveryCost: r.maxDeliveryCost === 0 ? 0 : undefined,
    returnsAccepted: typeof r.returnsAccepted === 'boolean' ? r.returnsAccepted : undefined,
    searchInDescription: typeof r.searchInDescription === 'boolean' ? r.searchInDescription : undefined,
    aspects,
    sort,
    limit: typeof r.limit === 'number' ? r.limit : undefined,
    offset: typeof r.offset === 'number' ? r.offset : undefined,
  }
}

function watchToDTO(watch: InstanceType<typeof WatchModel>) {
  return {
    id: String(watch._id),
    authId: watch.authId,
    name: watch.name,
    filters: watch.filters,
    notifyMode: watch.notifyMode,
    status: watch.status,
    startedAt: watch.startedAt,
    lastPolledAt: watch.lastPolledAt,
    nextPollAt: watch.nextPollAt,
    matchCount: watch.matchCount,
    pollCount: watch.pollCount,
    lastError: watch.lastError,
    createdAt: (watch as { createdAt?: Date }).createdAt ?? null,
    updatedAt: (watch as { updatedAt?: Date }).updatedAt ?? null,
  }
}

const watchRoutes = new Hono<AuthEnv>()

watchRoutes.use(requireAuth)

// ── GET / ── list my watches
watchRoutes.get('/', async (c) => {
  const authUser = c.get('user')
  const watches = await WatchModel.find({ authId: authUser.id })
    .sort({ createdAt: -1 })
    .lean()
  return c.json(watches.map((w) => ({
    id: String(w._id),
    authId: w.authId,
    name: w.name,
    filters: w.filters,
    notifyMode: w.notifyMode,
    status: w.status,
    startedAt: w.startedAt,
    lastPolledAt: w.lastPolledAt,
    nextPollAt: w.nextPollAt,
    matchCount: w.matchCount,
    pollCount: w.pollCount,
    lastError: w.lastError,
    createdAt: w.createdAt ?? null,
    updatedAt: w.updatedAt ?? null,
  })))
})

// ── POST / ── create
watchRoutes.post('/', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'invalid body' }, 400)
  }

  const filters = coerceFilters(body.filters)
  if (!filters) return c.json({ error: 'filters required' }, 400)

  const notifyMode =
    typeof body.notifyMode === 'string' && (NOTIFY_MODES as readonly string[]).includes(body.notifyMode)
      ? (body.notifyMode as (typeof NOTIFY_MODES)[number])
      : 'both'

  const rawName = typeof body.name === 'string' ? body.name.trim() : ''
  const name = rawName.length > 0 ? rawName.slice(0, 80) : defaultWatchName(filters)

  // Per-user cap (advanced mode raises the ceiling)
  const me = await UserModel.findOne({ authId: authUser.id }).select('advancedCollectMode').lean()
  const advanced = !!me?.advancedCollectMode
  const userCap = maxPerUser(advanced)
  const userActive = await WatchModel.countDocuments({
    authId: authUser.id,
    status: { $in: ['active', 'rate_limited'] },
  })
  if (userActive >= userCap) {
    return c.json(
      { error: `Reached the per-user limit of ${userCap} active watch(es). Pause or delete an existing watch first.` },
      429
    )
  }

  // Global cap
  const globalActive = await WatchModel.countDocuments({
    status: { $in: ['active', 'rate_limited'] },
  })
  if (globalActive >= maxGlobal()) {
    return c.json(
      { error: `Server-wide watch limit reached. Try again later.` },
      429
    )
  }

  const watch = await WatchModel.create({
    authId: authUser.id,
    name,
    filters,
    notifyMode,
    status: 'active',
    startedAt: new Date(),
    nextPollAt: new Date(),
  })
  return c.json(watchToDTO(watch), 201)
})

// ── GET /:id ── single watch
watchRoutes.get('/:id', async (c) => {
  const authUser = c.get('user')
  const { id } = c.req.param()
  const watch = await WatchModel.findOne({ _id: id, authId: authUser.id })
  if (!watch) return c.json({ error: 'not found' }, 404)
  return c.json(watchToDTO(watch))
})

// ── PATCH /:id ── update name / notifyMode / status
watchRoutes.patch('/:id', async (c) => {
  const authUser = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') return c.json({ error: 'invalid body' }, 400)

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim().slice(0, 80)
    if (trimmed.length > 0) updates.name = trimmed
  }
  if (typeof body.notifyMode === 'string' && (NOTIFY_MODES as readonly string[]).includes(body.notifyMode)) {
    updates.notifyMode = body.notifyMode
  }
  if (typeof body.status === 'string' && (STATUSES as readonly string[]).includes(body.status)) {
    updates.status = body.status
    // Resuming clears last error and primes nextPollAt
    if (body.status === 'active') {
      updates.lastError = null
      updates.nextPollAt = new Date()
    }
  }

  if (Object.keys(updates).length === 0) return c.json({ error: 'no valid fields' }, 400)

  const watch = await WatchModel.findOneAndUpdate(
    { _id: id, authId: authUser.id },
    { $set: updates },
    { new: true }
  )
  if (!watch) return c.json({ error: 'not found' }, 404)
  return c.json(watchToDTO(watch))
})

// ── DELETE /:id ── delete
watchRoutes.delete('/:id', async (c) => {
  const authUser = c.get('user')
  const { id } = c.req.param()
  const watch = await WatchModel.findOneAndDelete({ _id: id, authId: authUser.id })
  if (!watch) return c.json({ error: 'not found' }, 404)
  // Matches TTL'd out on their own; explicit cleanup for immediate space.
  await WatchMatchModel.deleteMany({ watchId: watch._id })
  return c.json({ id: String(watch._id), deleted: true })
})

// ── GET /:id/matches ── paginated history
watchRoutes.get('/:id/matches', async (c) => {
  const authUser = c.get('user')
  const { id } = c.req.param()

  // Confirm ownership before exposing matches
  const watch = await WatchModel.findOne({ _id: id, authId: authUser.id }).select('_id').lean()
  if (!watch) return c.json({ error: 'not found' }, 404)

  const rawLimit = Number(c.req.query('limit'))
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 200) : 50
  const before = c.req.query('before')

  const filter: Record<string, unknown> = { watchId: watch._id }
  if (before) {
    const t = Date.parse(before)
    if (Number.isFinite(t)) filter.matchedAt = { $lt: new Date(t) }
  }

  const matches = await WatchMatchModel.find(filter)
    .sort({ matchedAt: -1 })
    .limit(limit)
    .lean()

  return c.json(matches.map((m) => ({
    id: String(m._id),
    watchId: String(m.watchId),
    item: m.item,
    matchedAt: m.matchedAt,
    notified: m.notified,
  })))
})

// ── GET /:id/stream ── passive subscriber; scheduler does the polling
watchRoutes.get('/:id/stream', async (c) => {
  const authUser = c.get('user')
  const { id } = c.req.param()
  const watch = await WatchModel.findOne({ _id: id, authId: authUser.id })
  if (!watch) return c.json({ error: 'not found' }, 404)
  if (watch.status === 'paused') {
    return c.json({ error: 'watch is paused' }, 409)
  }

  return streamSSE(c, async (stream) => {
    const send = async (event: string, data: unknown) => {
      if (stream.aborted) return
      try {
        await stream.writeSSE({ event, data: JSON.stringify(data) })
      } catch {
        // Connection closed; subscriber will be cleaned up by onAbort below
      }
    }

    // Subscribe FIRST so any items the scheduler emits during replay
    // also reach this client (deduped on the client by itemId).
    const unsubscribe = subscribe(String(watch._id), send)

    await send('connected', {
      watchId: String(watch._id),
      startedAt: watch.startedAt,
      filters: watch.filters,
    })

    // Replay most recent matches so the page isn't blank on connect.
    const recent = await WatchMatchModel.find({ watchId: watch._id })
      .sort({ matchedAt: -1 })
      .limit(50)
      .lean()
    for (const m of [...recent].reverse()) {
      await send('item', m.item)
    }

    // Hold the connection open until the client disconnects.
    await new Promise<void>((resolve) => stream.onAbort(resolve))
    unsubscribe()
  })
})

export default watchRoutes
