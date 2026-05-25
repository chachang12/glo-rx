export type SendFn = (event: string, data: unknown) => Promise<void>
export type AbandonHandler = (watchId: string) => void | Promise<void>

// watchId → set of live SSE send functions. Multiple subscribers per watch
// (e.g. user has the detail page open in two tabs) are supported.
const registry = new Map<string, Set<SendFn>>()

// Debounced "no subscribers left" timers. When the last subscriber for a
// watch drops, we wait briefly before firing the abandon handler so that
// SPA navigations / refreshes / brief network blips don't trigger a
// premature notification.
const pendingAbandonTimers = new Map<string, NodeJS.Timeout>()
const ABANDON_DEBOUNCE_MS = 30_000
let abandonHandler: AbandonHandler | null = null

export function setAbandonHandler(handler: AbandonHandler | null): void {
  abandonHandler = handler
}

export function subscribe(watchId: string, send: SendFn): () => void {
  // Cancel any pending abandon — the user is back on the page.
  const pending = pendingAbandonTimers.get(watchId)
  if (pending) {
    clearTimeout(pending)
    pendingAbandonTimers.delete(watchId)
  }

  let set = registry.get(watchId)
  if (!set) {
    set = new Set()
    registry.set(watchId, set)
  }
  set.add(send)

  return () => {
    const current = registry.get(watchId)
    if (!current) return
    current.delete(send)
    if (current.size === 0) {
      registry.delete(watchId)
      if (abandonHandler) {
        const timer = setTimeout(() => {
          pendingAbandonTimers.delete(watchId)
          if (!abandonHandler) return
          // Re-check that nobody resubscribed during the timer tick.
          if ((registry.get(watchId)?.size ?? 0) > 0) return
          Promise.resolve(abandonHandler(watchId)).catch((err) =>
            console.warn('[sse-registry] abandon handler error', err)
          )
        }, ABANDON_DEBOUNCE_MS)
        pendingAbandonTimers.set(watchId, timer)
      }
    }
  }
}

export function hasSubscribers(watchId: string): boolean {
  return (registry.get(watchId)?.size ?? 0) > 0
}

export async function emit(watchId: string, event: string, data: unknown): Promise<void> {
  const set = registry.get(watchId)
  if (!set) return
  // Fire all in parallel; one slow subscriber shouldn't block others.
  await Promise.all([...set].map((send) => send(event, data).catch(() => undefined)))
}

export function subscriberCount(watchId: string): number {
  return registry.get(watchId)?.size ?? 0
}
