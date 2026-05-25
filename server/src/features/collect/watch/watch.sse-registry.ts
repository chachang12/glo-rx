export type SendFn = (event: string, data: unknown) => Promise<void>

// watchId → set of live SSE send functions. Multiple subscribers per watch
// (e.g. user has the detail page open in two tabs) are supported.
const registry = new Map<string, Set<SendFn>>()

export function subscribe(watchId: string, send: SendFn): () => void {
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
    if (current.size === 0) registry.delete(watchId)
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
