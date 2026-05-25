import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { paths } from '@/config/paths'
import { useGetMe } from '@/features/shared/user'
import {
  useGetWatch,
  useUpdateWatch,
  useDeleteWatch,
  useGetWatchMatches,
  type NotifyMode,
  type Watch,
  type WatchStatus,
} from '@/features/collect/watches'
import { WatchFeed } from '@/features/collect/watches/components/WatchFeed'
import { ResultCard } from '@/features/collect/ebay/components/ResultCard'

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

const NOTIFY_OPTIONS: { value: NotifyMode; label: string; sub: string }[] = [
  { value: 'sse_only', label: 'App only', sub: 'See matches only on this page' },
  { value: 'telegram_only', label: 'Telegram only', sub: 'Quiet UI, alerts to your phone' },
  { value: 'both', label: 'Both', sub: 'App while open, Telegram while away' },
]

export const CollectWatchDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: watch, isLoading, error } = useGetWatch(id)
  const { data: matches = [] } = useGetWatchMatches(id)
  const { data: me } = useGetMe()
  const update = useUpdateWatch(id ?? '')
  const del = useDeleteWatch()

  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1240px] px-6 py-12">
        <div className="rounded-lg border border-line bg-glass p-8 text-center text-sm text-ink-dim">
          Loading watch…
        </div>
      </main>
    )
  }

  if (error || !watch) {
    return (
      <main className="mx-auto max-w-[1240px] px-6 py-12">
        <nav className="mb-4 text-xs text-ink-faint">
          <Link to={paths.app.collect.watches.getHref()} className="hover:text-ink">
            ← All watches
          </Link>
        </nav>
        <div className="rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {error instanceof Error ? error.message : 'Watch not found'}
        </div>
      </main>
    )
  }

  const togglePause = () => {
    update.mutate({ status: watch.status === 'paused' ? 'active' : 'paused' })
  }

  const handleDelete = () => {
    if (!confirm(`Delete watch "${watch.name}"?`)) return
    del.mutate(watch.id, {
      onSuccess: () => navigate(paths.app.collect.watches.getHref()),
    })
  }

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-12">
      <nav className="mb-4 text-xs text-ink-faint">
        <Link to={paths.app.collect.watches.getHref()} className="hover:text-ink">
          ← All watches
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
            Axeous / Collect / Watch
          </p>
          <NameEditor watch={watch} onSave={(name) => update.mutate({ name })} />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[watch.status]}`} />
            <span>{STATUS_LABEL[watch.status]}</span>
            <span>·</span>
            <span>{watch.matchCount} match{watch.matchCount === 1 ? '' : 'es'}</span>
            {watch.lastError && (
              <>
                <span>·</span>
                <span className="text-brand-coral">{watch.lastError.message}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePause}
            disabled={update.isPending}
            className="rounded-full border border-line bg-glass px-3 py-1.5 text-sm text-ink-dim hover:text-ink disabled:opacity-50"
          >
            {watch.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={del.isPending}
            className="rounded-full border border-brand-coral/30 bg-brand-coral/5 px-3 py-1.5 text-sm text-brand-coral hover:bg-brand-coral/10 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </header>

      {/* Settings */}
      <section className="mb-6 rounded-lg border border-line bg-glass p-5">
        <div className="mb-3 text-xs uppercase tracking-widest text-ink-faint">Notify mode</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {NOTIFY_OPTIONS.map((opt) => {
            const on = watch.notifyMode === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                disabled={update.isPending}
                onClick={() => update.mutate({ notifyMode: opt.value })}
                className={`rounded-md border p-3 text-left transition-colors disabled:opacity-50 ${
                  on
                    ? 'border-line-strong bg-glass-strong'
                    : 'border-line bg-glass hover:bg-glass-strong'
                }`}
              >
                <div className="text-sm font-medium text-ink">{opt.label}</div>
                <div className="text-xs text-ink-faint">{opt.sub}</div>
              </button>
            )
          })}
        </div>
        {watch.notifyMode !== 'sse_only' && !me?.telegramChatId && (
          <div className="mt-3 rounded-md border border-brand-amber/40 bg-brand-amber/5 px-3 py-2 text-xs text-brand-amber">
            Link Telegram to receive notifications.{' '}
            <Link to={paths.app.collect.profile.getHref()} className="underline">
              Connect on profile
            </Link>
          </div>
        )}
        <FiltersSummary watch={watch} />
      </section>

      {/* Live stream */}
      <h2 className="mb-3 text-sm uppercase tracking-widest text-ink-faint">Live</h2>
      {watch.status === 'paused' ? (
        <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
          Watch is paused. Resume to start streaming.
        </div>
      ) : (
        <WatchFeed watchId={watch.id} />
      )}

      {/* History */}
      <h2 className="mt-8 mb-3 text-sm uppercase tracking-widest text-ink-faint">Recent matches</h2>
      {matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
          No matches yet. The scheduler will populate this list as new listings come in.
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <ResultCard key={m.id} item={m.item} />
          ))}
        </div>
      )}
    </main>
  )
}

function NameEditor({ watch, onSave }: { watch: Watch; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(watch.name)

  if (!editing) {
    return (
      <h1
        onClick={() => {
          setValue(watch.name)
          setEditing(true)
        }}
        className="mt-2 cursor-text text-3xl font-medium tracking-tight text-ink"
      >
        {watch.name}
      </h1>
    )
  }

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== watch.name) onSave(trimmed)
    setEditing(false)
  }

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'Escape') setEditing(false)
      }}
      maxLength={80}
      className="mt-2 w-full rounded-md border border-line-strong bg-glass-strong px-2 py-1 text-3xl font-medium tracking-tight text-ink outline-none"
    />
  )
}

function FiltersSummary({ watch }: { watch: Watch }) {
  const f = watch.filters
  const rows: { label: string; value: string }[] = []
  if (f.q) rows.push({ label: 'Keywords', value: f.q })
  if (f.categoryId) rows.push({ label: 'Category', value: f.categoryId })
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    const min = f.priceMin !== undefined ? `$${f.priceMin}` : '$0'
    const max = f.priceMax !== undefined ? `$${f.priceMax}` : 'any'
    rows.push({ label: 'Price', value: `${min} – ${max}` })
  }
  if (f.conditions?.length) rows.push({ label: 'Conditions', value: f.conditions.join(', ') })
  if (f.buyingOptions?.length) rows.push({ label: 'Buying options', value: f.buyingOptions.join(', ') })
  if (f.sort) rows.push({ label: 'Sort', value: f.sort })
  if (f.itemLocationCountry) rows.push({ label: 'Location', value: f.itemLocationCountry })
  if (f.maxDeliveryCost === 0) rows.push({ label: 'Shipping', value: 'Free only' })
  if (f.returnsAccepted) rows.push({ label: 'Returns', value: 'Required' })
  if (f.aspects) {
    for (const [k, v] of Object.entries(f.aspects)) {
      rows.push({ label: k, value: v.join(', ') })
    }
  }

  if (rows.length === 0) return null

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="mb-3 text-xs uppercase tracking-widest text-ink-faint">Filters</div>
      <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2 text-sm">
            <dt className="text-ink-faint">{r.label}:</dt>
            <dd className="text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
