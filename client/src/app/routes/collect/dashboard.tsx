import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useGetEbayQuota } from '@/features/collect/ebay'

function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const CollectDashboard = () => {
  const { data: quota, isLoading } = useGetEbayQuota()

  const pct = quota ? Math.min(100, Math.round((quota.dailyCalls / quota.limit) * 100)) : 0
  const remaining = quota ? Math.max(0, quota.limit - quota.dailyCalls) : null
  const barColor = pct >= 90 ? 'bg-brand-coral' : pct >= 70 ? 'bg-brand-amber' : 'bg-brand-teal'

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-12">
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
          Axeous / Collect
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">Dashboard</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Search eBay or stream new listings as they post.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to={paths.app.collect.search.getHref()}
          className="rounded-lg border border-line bg-glass p-6 transition-colors hover:border-line-strong hover:bg-glass-strong"
        >
          <div className="text-xs uppercase tracking-widest text-ink-faint">Browse</div>
          <div className="mt-2 text-lg font-medium text-ink">Search listings</div>
          <p className="mt-1 text-sm text-ink-dim">
            One-shot search with filters, conditions, price ranges, and category aspects.
          </p>
        </Link>

        <Link
          to={paths.app.collect.watch.getHref()}
          className="rounded-lg border border-line bg-glass p-6 transition-colors hover:border-line-strong hover:bg-glass-strong"
        >
          <div className="text-xs uppercase tracking-widest text-ink-faint">Live</div>
          <div className="mt-2 text-lg font-medium text-ink">Start a watch</div>
          <p className="mt-1 text-sm text-ink-dim">
            Stream new listings the moment they appear on eBay. Up to 3 concurrent.
          </p>
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-line bg-glass p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-xs uppercase tracking-widest text-ink-faint">eBay API quota</div>
          <div className="text-xs text-ink-faint">
            {isLoading ? 'Loading…' : quota ? `resets ${fmtClock(quota.resetAt)}` : '—'}
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-3xl font-medium tracking-tight text-ink">
            {quota?.dailyCalls ?? '—'}
          </span>
          <span className="text-sm text-ink-dim">
            / {quota?.limit ?? '—'} calls today
          </span>
          {remaining !== null && (
            <span className="text-xs text-ink-faint">({remaining} remaining)</span>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-glass">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-ink-faint">
          <span>{quota?.activeWatches ?? 0} active watch{quota?.activeWatches === 1 ? '' : 'es'}</span>
          <span>Hard cap protects the 5,000/day daily ceiling.</span>
        </div>
      </section>
    </main>
  )
}
