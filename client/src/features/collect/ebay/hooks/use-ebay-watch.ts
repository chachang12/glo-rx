import { useEffect, useMemo, useRef, useState } from 'react'
import { API_URL } from '@/lib/api/client'
import {
  CompactItemSchema,
  filtersToQuery,
  type CompactItem,
  type SearchFilters,
} from '../types/ebay.schema'

export type WatchStatus = 'idle' | 'connecting' | 'open' | 'error' | 'rate_limited' | 'closed'

interface WatchState {
  items: CompactItem[]
  status: WatchStatus
  lastHeartbeatAt: Date | null
  newItemsInLastPoll: number
  pollCount: number
  watchId: string | null
  startedAt: Date | null
  error: string | null
  rateLimit: { remaining: number; resetAt: number } | null
}

const initialState: WatchState = {
  items: [],
  status: 'idle',
  lastHeartbeatAt: null,
  newItemsInLastPoll: 0,
  pollCount: 0,
  watchId: null,
  startedAt: null,
  error: null,
  rateLimit: null,
}

// Stable identity for the filters object so the effect doesn't re-fire on
// every render. JSON.stringify is fine here — filter shapes are small.
function filtersKey(f: SearchFilters | null): string | null {
  return f ? JSON.stringify(f) : null
}

export function useEbayWatch(filters: SearchFilters | null) {
  const [state, setState] = useState<WatchState>(initialState)
  const [nonce, setNonce] = useState(0)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const key = useMemo(() => filtersKey(filters), [filters])

  useEffect(() => {
    if (!filters || !key) {
      setState(initialState)
      return
    }

    setState({ ...initialState, status: 'connecting' })

    const qs = filtersToQuery(filters).toString()
    const url = `${API_URL}/api/collect/ebay/watch?${qs}`
    const es = new EventSource(url, { withCredentials: true })

    es.addEventListener('connected', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as {
          watchId: string
          startedAt: string
        }
        setState((s) => ({
          ...s,
          status: 'open',
          watchId: payload.watchId,
          startedAt: new Date(payload.startedAt),
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
          console.warn('[useEbayWatch] item failed schema', parsed.error.issues)
          return
        }
        setState((s) => ({ ...s, items: [parsed.data, ...s.items] }))
      } catch (err) {
        console.warn('[useEbayWatch] item parse failed', err)
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
            error: payload.message ?? 'eBay API error',
          }))
          return
        }
      } catch { /* fall through */ }
      // Native EventSource error (network / proxy close). Browser will auto-reconnect.
      setState((s) => (s.status === 'open' ? { ...s, status: 'connecting' } : s))
    })

    return () => {
      es.close()
      setState((s) => ({ ...s, status: 'closed' }))
    }
  }, [key, nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    reconnect: () => setNonce((n) => n + 1),
  }
}
