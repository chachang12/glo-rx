import { EbayApiError, getCallStats, searchItems } from '../ebay/ebay.client.js'
import type { SearchFilters } from '../ebay/ebay.types.js'
import { WatchModel } from './watch.model.js'
import { dispatchMatches } from './watch.dispatcher.js'
import { emit } from './watch.sse-registry.js'
import { UserModel } from '../../shared/user/user.model.js'
import { ADVANCED_POLL_INTERVAL_MS } from '../advanced/index.js'

// eBay Browse API indexing lag can be 2-10 minutes between listing creation
// and appearance in search results. The overlap buffer is sized to cover that
// — every poll asks for items since (lastPoll - OVERLAP_MS). seenItemIds
// dedup ensures we don't re-emit items across overlapping windows.
const OVERLAP_MS = 5 * 60_000
const FANOUT_PER_TICK = 10
const QUOTA_HARD_STOP_RATIO = 0.95

let timer: NodeJS.Timeout | null = null
let inTick = false

function tickIntervalMs(): number {
  const v = Number(process.env.SCHEDULER_TICK_MS)
  return Number.isFinite(v) && v >= 5000 ? Math.floor(v) : 15000
}

// Advanced users get the floor (ADVANCED_POLL_INTERVAL_MS). Everyone else
// uses the env value (clamped to >= ADVANCED_POLL_INTERVAL_MS) or 60s default.
function pollIntervalMs(advanced = false): number {
  if (advanced) return ADVANCED_POLL_INTERVAL_MS
  const v = Number(process.env.WATCH_POLL_INTERVAL_MS)
  return Number.isFinite(v) && v >= ADVANCED_POLL_INTERVAL_MS ? Math.floor(v) : 60000
}

function jitterMs(): number {
  // ±5s so back-to-back watches don't synchronize their polls.
  return Math.floor((Math.random() - 0.5) * 10_000)
}

function quotaExhausted(): boolean {
  const stats = getCallStats()
  return stats.dailyCalls >= QUOTA_HARD_STOP_RATIO * stats.limit
}

function isFatalEbayError(err: unknown): boolean {
  return err instanceof EbayApiError && (err.status === 401 || err.status === 403)
}

export function startScheduler() {
  if (timer) return
  const ms = tickIntervalMs()
  timer = setInterval(() => {
    if (inTick) return
    inTick = true
    void tick().finally(() => { inTick = false })
  }, ms)
  console.log(`[scheduler] started, tick=${ms}ms, pollInterval=${pollIntervalMs()}ms`)
}

export function stopScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}

async function tick() {
  if (quotaExhausted()) {
    await flipActiveToRateLimited()
    return
  }

  const due = await WatchModel.find({
    status: 'active',
    nextPollAt: { $lte: new Date() },
  })
    .sort({ nextPollAt: 1 })
    .limit(FANOUT_PER_TICK)

  for (const watch of due) {
    if (quotaExhausted()) {
      await flipActiveToRateLimited()
      break
    }
    try {
      await pollOneWatch(watch)
    } catch (err) {
      console.error('[scheduler] pollOneWatch error', err)
    }
  }
}

async function flipActiveToRateLimited() {
  const stats = getCallStats()
  await WatchModel.updateMany(
    { status: 'active' },
    {
      $set: {
        status: 'rate_limited',
        lastError: {
          message: 'Daily eBay quota exhausted',
          status: null,
          at: new Date(),
        },
      },
    }
  )
  // Best-effort notify any live subscribers
  const rateLimited = await WatchModel.find({ status: 'rate_limited' }).select('_id').lean()
  for (const w of rateLimited) {
    await emit(String(w._id), 'rate_limit', {
      remaining: Math.max(stats.limit - stats.dailyCalls, 0),
      resetAt: stats.resetAt,
      fatal: true,
    })
  }
}

async function pollOneWatch(watch: InstanceType<typeof WatchModel>) {
  const sinceMs = computeSinceMs(watch)
  const sinceISO = new Date(sinceMs).toISOString()
  // Mongoose embedded subdoc → plain object. Spreading the subdoc directly
  // loses field values because data lives on _doc behind getters.
  const filters = (watch.filters as unknown as { toObject?: () => SearchFilters })
    .toObject?.() ?? (watch.filters as unknown as SearchFilters)
  const pollStart = Date.now()
  const owner = await UserModel.findOne({ authId: watch.authId }).select('advancedCollectMode').lean()
  const advanced = !!owner?.advancedCollectMode

  let newItems
  try {
    const result = await searchItems(
      { ...filters, sort: 'newlyListed', limit: filters.limit ?? 50 },
      { sinceISO }
    )
    const seen = new Set(watch.seenItemIds)
    newItems = result.items.filter((i) => !seen.has(i.itemId))
  } catch (err) {
    const apiErr = err instanceof EbayApiError ? err : null
    watch.lastError = {
      message: err instanceof Error ? err.message : 'Unknown error',
      status: apiErr?.status ?? null,
      at: new Date(),
    }
    if (isFatalEbayError(err)) watch.status = 'error'
    watch.lastPolledAt = new Date(pollStart)
    watch.nextPollAt = new Date(Date.now() + pollIntervalMs(advanced) + jitterMs())
    await watch.save()

    await emit(String(watch._id), 'error', {
      message: watch.lastError.message,
      status: watch.lastError.status,
      fatal: watch.status === 'error',
    })
    return
  }

  if (newItems.length > 0) {
    await dispatchMatches(watch, newItems)
    watch.seenItemIds = [...watch.seenItemIds, ...newItems.map((i) => i.itemId)]
  }

  const pollStartDate = new Date(pollStart)
  const nextPollAt = new Date(Date.now() + pollIntervalMs() + jitterMs())

  // Increment the counters atomically with $inc rather than read-modify-save,
  // so the running totals can't be clobbered by a concurrent write. The
  // snapshot fields (seen ids, timestamps) are still set in the same update.
  await WatchModel.updateOne(
    { _id: watch._id },
    {
      $inc: {
        pollCount: 1,
        ...(newItems.length > 0 ? { matchCount: newItems.length } : {}),
      },
      $set: {
        seenItemIds: watch.seenItemIds,
        lastPolledAt: pollStartDate,
        nextPollAt,
        lastError: null,
      },
    }
  )

  // Reflect the new values on the in-memory doc for the heartbeat/log below.
  watch.matchCount += newItems.length
  watch.pollCount += 1
  watch.lastPolledAt = pollStartDate
  watch.nextPollAt = nextPollAt
  watch.lastError = null

  const durationMs = Date.now() - pollStart
  console.log(
    `[scheduler] poll #${watch.pollCount} watch=${watch._id} q="${filters.q ?? ''}" ` +
      `new=${newItems.length} since=${sinceISO} took=${durationMs}ms`
  )

  await emit(String(watch._id), 'heartbeat', {
    pollCount: watch.pollCount,
    lastPollAt: new Date(pollStart).toISOString(),
    newItemsInPoll: newItems.length,
    dailyCalls: getCallStats().dailyCalls,
  })
}

function computeSinceMs(watch: InstanceType<typeof WatchModel>): number {
  const anchor = watch.lastPolledAt ?? watch.startedAt ?? new Date()
  return anchor.getTime() - OVERLAP_MS
}
