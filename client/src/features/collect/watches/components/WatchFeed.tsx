import { ResultCard } from '@/features/collect/ebay/components/ResultCard'
import { useWatchStream, type StreamStatus } from '../hooks/use-watch-stream'

interface Props {
  watchId: string | null
}

const STATUS_LABEL: Record<StreamStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting…',
  open: 'Live',
  error: 'Error',
  rate_limited: 'Rate limited',
  closed: 'Closed',
}

const STATUS_DOT: Record<StreamStatus, string> = {
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

export function WatchFeed({ watchId }: Props) {
  const stream = useWatchStream(watchId)

  if (!watchId) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
        No active stream.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-glass px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[stream.status]}`} />
          <span className="text-sm font-medium text-ink">{STATUS_LABEL[stream.status]}</span>
          <span className="text-xs text-ink-faint">
            poll #{stream.pollCount} · last {fmtClock(stream.lastHeartbeatAt)}
          </span>
        </div>
      </div>

      {stream.error && (
        <div className="rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {stream.error}
        </div>
      )}

      {stream.rateLimit && (
        <div className="rounded-md border border-brand-amber/40 bg-brand-amber/5 px-4 py-2 text-sm text-brand-amber">
          eBay quota nearly exhausted ({stream.rateLimit.remaining} calls left).
        </div>
      )}

      {stream.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
          Watching for new listings… nothing yet this session.
        </div>
      ) : (
        <div className="space-y-2">
          {stream.items.map((item, idx) => (
            <ResultCard
              key={item.itemId}
              item={item}
              highlight={idx === 0 && stream.newItemsInLastPoll > 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
