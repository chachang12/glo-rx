import { EbayApiError, getCallStats, searchItems } from '../ebay/ebay.client.js'
import type { SearchFilters } from '../ebay/ebay.types.js'
import { WatchModel } from './watch.model.js'
import { dispatchMatches } from './watch.dispatcher.js'
import { emit } from './watch.sse-registry.js'

const OVERLAP_MS = 60_000
const FANOUT_PER_TICK = 5
const QUOTA_HARD_STOP_RATIO = 0.95

let timer: NodeJS.Timeout | null = null
let inTick = false

function tickIntervalMs(): number {
  const v = Number(process.env.SCHEDULER_TICK_MS)
  return Number.isFinite(v) && v >= 5000 ? Math.floor(v) : 15000
}

function pollIntervalMs(): number {
  const v = Number(process.env.WATCH_POLL_INTERVAL_MS)
  return Number.isFinite(v) && v >= 15000 ? Math.floor(v) : 60000
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
  const filters = watch.filters as SearchFilters
  const pollStart = Date.now()

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
    watch.nextPollAt = new Date(Date.now() + pollIntervalMs() + jitterMs())
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
    watch.matchCount += newItems.length
  }

  watch.pollCount += 1
  watch.lastPolledAt = new Date(pollStart)
  watch.nextPollAt = new Date(Date.now() + pollIntervalMs() + jitterMs())
  watch.lastError = null
  await watch.save()

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
