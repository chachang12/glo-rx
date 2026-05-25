import { useEbayWatch, type WatchStatus } from '../hooks/use-ebay-watch'
import type { SearchFilters } from '../types/ebay.schema'
import { ResultCard } from './ResultCard'

interface Props {
  filters: SearchFilters | null
  onStop: () => void
}

const STATUS_LABEL: Record<WatchStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting…',
  open: 'Live',
  error: 'Error',
  rate_limited: 'Rate limited',
  closed: 'Closed',
}

const STATUS_DOT: Record<WatchStatus, string> = {
  idle: 'bg-ink-faint',
  connecting: 'bg-brand-amber animate-pulse',
  open: 'bg-brand-teal animate-pulse',
  error: 'bg-brand-coral',
  rate_limited: 'bg-brand-coral',
  closed: 'bg-ink-faint',
}

function fmtClock(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function WatchFeed({ filters, onStop }: Props) {
  const watch = useEbayWatch(filters)

  if (!filters) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
        Configure filters and start a watch to stream new listings as they post.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-glass px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[watch.status]}`} />
          <span className="text-sm font-medium text-ink">{STATUS_LABEL[watch.status]}</span>
          <span className="text-xs text-ink-faint">
            poll #{watch.pollCount} · last {fmtClock(watch.lastHeartbeatAt)}
            {watch.startedAt && ` · started ${fmtClock(watch.startedAt)}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onStop}
          className="rounded-full border border-line bg-glass px-3 py-1 text-xs text-ink-dim hover:text-ink"
        >
          Stop
        </button>
      </div>

      {watch.error && (
        <div className="rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {watch.error}
        </div>
      )}

      {watch.rateLimit && (
        <div className="rounded-md border border-brand-amber/40 bg-brand-amber/5 px-4 py-2 text-sm text-brand-amber">
          eBay quota is nearly exhausted ({watch.rateLimit.remaining} calls left).
        </div>
      )}

      {watch.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
          Watching for new listings… nothing yet.
        </div>
      ) : (
        <div className="space-y-2">
          {watch.items.map((item, idx) => (
            <ResultCard key={item.itemId} item={item} highlight={idx === 0 && watch.newItemsInLastPoll > 0} />
          ))}
        </div>
      )}
    </div>
  )
}
