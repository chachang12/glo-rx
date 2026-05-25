import { randomUUID } from 'node:crypto'
import { EbayApiError, getCallStats, searchItems } from './ebay.client.js'
import type { SearchFilters } from './ebay.types.js'

interface WatchEntry {
  watchId: string
  authId: string
  startedAt: Date
  filters: SearchFilters
}

const watches = new Map<string, WatchEntry>()

function maxConcurrent(): number {
  const v = Number(process.env.WATCH_MAX_CONCURRENT)
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 3
}

function pollIntervalMs(): number {
  const v = Number(process.env.WATCH_POLL_INTERVAL_MS)
  return Number.isFinite(v) && v >= 15000 ? Math.floor(v) : 60000
}

export function activeWatchCount(): number {
  return watches.size
}

export function canStartWatch(): boolean {
  return watches.size < maxConcurrent()
}

export function listWatches(): WatchEntry[] {
  return Array.from(watches.values())
}

export type WatchEvent = 'connected' | 'item' | 'heartbeat' | 'rate_limit' | 'error'
export type SendFn = (event: WatchEvent, data: unknown) => Promise<void>

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Runs a watch until the abort signal fires or a fatal error occurs.
 * The send callback is supplied by the SSE route. Polls eBay on a fixed
 * interval, emitting only items not previously seen in this connection.
 */
export async function runWatch(
  authId: string,
  filters: SearchFilters,
  send: SendFn,
  signal: AbortSignal
): Promise<void> {
  const watchId = randomUUID()
  const startedAt = new Date()
  const entry: WatchEntry = { watchId, authId, startedAt, filters }
  watches.set(watchId, entry)

  const seen = new Set<string>()
  // Overlap buffer: subtract 60s so we don't miss items indexed during the gap.
  let sinceMs = startedAt.getTime() - 60_000

  await send('connected', {
    watchId,
    startedAt: startedAt.toISOString(),
    filters,
    pollIntervalMs: pollIntervalMs(),
  })

  let pollCount = 0

  try {
    while (!signal.aborted) {
      // Bail-out guard for daily quota.
      const stats = getCallStats()
      if (stats.dailyCalls >= 0.9 * stats.limit) {
        await send('rate_limit', {
          remaining: Math.max(stats.limit - stats.dailyCalls, 0),
          resetAt: stats.resetAt,
          fatal: true,
        })
        break
      }

      pollCount += 1
      const sinceISO = new Date(sinceMs).toISOString()
      const pollStart = Date.now()
      let newItemsInPoll = 0
      let latestOrigin = 0

      try {
        const result = await searchItems(
          {
            ...filters,
            sort: 'newlyListed',
            limit: filters.limit ?? 50,
          },
          { sinceISO }
        )

        for (const item of result.items) {
          if (signal.aborted) break
          if (seen.has(item.itemId)) continue
          seen.add(item.itemId)
          newItemsInPoll += 1
          await send('item', item)
          if (item.itemOriginDate) {
            const t = Date.parse(item.itemOriginDate)
            if (Number.isFinite(t) && t > latestOrigin) latestOrigin = t
          }
        }
      } catch (err) {
        const apiErr = err instanceof EbayApiError ? err : null
        const fatal = apiErr?.status === 401 || apiErr?.status === 403
        await send('error', {
          message: err instanceof Error ? err.message : String(err),
          status: apiErr?.status ?? null,
          fatal,
        })
        if (fatal) break
      }

      // Advance the window: prefer latest observed item time, else the
      // current poll start, both with the 60s overlap.
      const newSince = (latestOrigin > 0 ? latestOrigin : pollStart) - 60_000
      if (newSince > sinceMs) sinceMs = newSince

      await send('heartbeat', {
        pollCount,
        lastPollAt: new Date(pollStart).toISOString(),
        newItemsInPoll,
        dailyCalls: getCallStats().dailyCalls,
      })

      if (signal.aborted) break
      await sleep(pollIntervalMs(), signal)
    }
  } finally {
    watches.delete(watchId)
  }
}
