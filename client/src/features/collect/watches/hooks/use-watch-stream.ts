import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/api/client'
import {
  CompactItemSchema,
  type CompactItem,
} from '@/features/collect/ebay/types/ebay.schema'

export type StreamStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'error'
  | 'rate_limited'
  | 'closed'

// Bound the in-memory item buffer so long-running streams on busy watches
// don't accumulate thousands of DOM nodes. Older items remain queryable via
// /api/collect/watches/:id/matches (REST) if a user paginates.
const MAX_ITEMS = 200

interface State {
  items: CompactItem[]
  status: StreamStatus
  lastHeartbeatAt: Date | null
  newItemsInLastPoll: number
  pollCount: number
  startedAt: Date | null
  error: string | null
  rateLimit: { remaining: number; resetAt: number } | null
}

const initialState: State = {
  items: [],
  status: 'idle',
  lastHeartbeatAt: null,
  newItemsInLastPoll: 0,
  pollCount: 0,
  startedAt: null,
  error: null,
  rateLimit: null,
}

export function useWatchStream(watchId: string | null) {
  const [state, setState] = useState<State>(initialState)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!watchId) {
      setState(initialState)
      return
    }

    setState({ ...initialState, status: 'connecting' })

    const url = `${API_URL}/api/collect/watches/${encodeURIComponent(watchId)}/stream`
    const es = new EventSource(url, { withCredentials: true })

    es.addEventListener('connected', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as { startedAt?: string }
        setState((s) => ({
          ...s,
          status: 'open',
          startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
        }))
      } catch {
        setState((s) => ({ ...s, status: 'open' }))
      }
    })

    es.addEventListener('item', (e) => {
      try {
        const raw = JSON.parse((e as MessageEvent).data)
        const parsed = CompactItemSchema.safeParse(raw)
        if (!parsed.success) {
          console.warn('[useWatchStream] item failed schema', parsed.error.issues)
          return
        }
        // Dedup by itemId — replay + live can overlap during connect race.
        setState((s) => {
          if (s.items.some((i) => i.itemId === parsed.data.itemId)) return s
          const next = [parsed.data, ...s.items]
          return {
            ...s,
            items: next.length > MAX_ITEMS ? next.slice(0, MAX_ITEMS) : next,
          }
        })
      } catch (err) {
        console.warn('[useWatchStream] item parse failed', err)
      }
    })

    es.addEventListener('heartbeat', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as {
          pollCount: number
          lastPollAt: string
          newItemsInPoll: number
        }
        setState((s) => ({
          ...s,
          pollCount: payload.pollCount,
          lastHeartbeatAt: new Date(payload.lastPollAt),
          newItemsInLastPoll: payload.newItemsInPoll,
        }))
      } catch { /* ignore */ }
    })

    es.addEventListener('rate_limit', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as {
          remaining: number
          resetAt: number
          fatal?: boolean
        }
        setState((s) => ({
          ...s,
          status: payload.fatal ? 'rate_limited' : s.status,
          rateLimit: { remaining: payload.remaining, resetAt: payload.resetAt },
        }))
      } catch { /* ignore */ }
    })

    es.addEventListener('error', (e) => {
      try {
        const data = (e as MessageEvent).data
        if (typeof data === 'string' && data.length > 0) {
          const payload = JSON.parse(data) as { message?: string; fatal?: boolean }
          setState((s) => ({
            ...s,
            status: payload.fatal ? 'error' : s.status,
            error: payload.message ?? 'stream error',
          }))
          return
        }
      } catch { /* fall through */ }
      setState((s) => (s.status === 'open' ? { ...s, status: 'connecting' } : s))
    })

    return () => {
      es.close()
      setState((s) => ({ ...s, status: 'closed' }))
    }
  }, [watchId, nonce])

  return {
    ...state,
    reconnect: () => setNonce((n) => n + 1),
  }
}
