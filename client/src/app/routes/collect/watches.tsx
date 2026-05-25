import { Link } from 'react-router'
import { paths } from '@/config/paths'
import {
  useGetWatches,
  useUpdateWatch,
  useDeleteWatch,
  type Watch,
  type WatchStatus,
} from '@/features/collect/watches'

const STATUS_LABEL: Record<WatchStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  rate_limited: 'Rate limited',
  error: 'Error',
}

const STATUS_DOT: Record<WatchStatus, string> = {
  active: 'bg-brand-teal',
  paused: 'bg-ink-faint',
  rate_limited: 'bg-brand-amber',
  error: 'bg-brand-coral',
}

const NOTIFY_LABEL = {
  sse_only: 'App only',
  telegram_only: 'Telegram only',
  both: 'App + Telegram',
} as const

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'never'
  const s = Math.max(1, Math.round((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export const CollectWatches = () => {
  const { data: watches = [], isLoading, error } = useGetWatches()

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
            Axeous / Collect
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">Watches</h1>
          <p className="mt-2 text-sm text-ink-dim">
            Saved searches that poll eBay and notify you when something new lists.
          </p>
        </div>
        <Link
          to={paths.app.collect.watchNew.getHref()}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-ink/90"
        >
          + New watch
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {error instanceof Error ? error.message : 'Failed to load watches'}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-line bg-glass p-8 text-center text-sm text-ink-dim">
          Loading watches…
        </div>
      ) : watches.length === 0 ? (
        <Link
          to={paths.app.collect.watchNew.getHref()}
          className="block rounded-lg border border-dashed border-line bg-glass p-12 text-center text-sm text-ink-dim transition-colors hover:border-line-strong hover:bg-glass-strong"
        >
          No watches yet — create one to start tracking new eBay listings.
        </Link>
      ) : (
        <div className="space-y-3">
          {watches.map((watch) => (
            <WatchRow key={watch.id} watch={watch} />
          ))}
        </div>
      )}
    </main>
  )
}

function WatchRow({ watch }: { watch: Watch }) {
  const update = useUpdateWatch(watch.id)
  const del = useDeleteWatch()

  const togglePause = () => {
    update.mutate({ status: watch.status === 'paused' ? 'active' : 'paused' })
  }

  const handleDelete = () => {
    if (!confirm(`Delete watch "${watch.name}"?`)) return
    del.mutate(watch.id)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-glass p-4">
      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[watch.status]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <Link
            to={paths.app.collect.watchDetail.getHref(watch.id)}
            className="text-base font-medium text-ink hover:text-brand-amber"
          >
            {watch.name}
          </Link>
          <span className="text-xs text-ink-faint">
            {STATUS_LABEL[watch.status]} · {NOTIFY_LABEL[watch.notifyMode]}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-ink-faint">
          {watch.matchCount} match{watch.matchCount === 1 ? '' : 'es'} ·
          {' '}last polled {fmtRelative(watch.lastPolledAt)}
          {watch.lastError && <span className="text-brand-coral"> · {watch.lastError.message}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={paths.app.collect.watchDetail.getHref(watch.id)}
          className="rounded-full border border-line bg-glass px-3 py-1 text-xs text-ink-dim hover:text-ink"
        >
          View
        </Link>
        <button
          type="button"
          onClick={togglePause}
          disabled={update.isPending}
          className="rounded-full border border-line bg-glass px-3 py-1 text-xs text-ink-dim hover:text-ink disabled:opacity-50"
        >
          {watch.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={del.isPending}
          className="rounded-full border border-brand-coral/30 bg-brand-coral/5 px-3 py-1 text-xs text-brand-coral hover:bg-brand-coral/10 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
