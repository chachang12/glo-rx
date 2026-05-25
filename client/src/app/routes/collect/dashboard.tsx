import { useGetEbayQuota } from '@/features/collect/ebay'
import { MultiView } from '@/features/collect/dashboard/MultiView'

export const CollectDashboard = () => {
  const { data: quota } = useGetEbayQuota()
  const pct = quota ? Math.min(100, Math.round((quota.dailyCalls / quota.limit) * 100)) : 0
  const callsTone =
    pct >= 90 ? 'text-brand-coral' : pct >= 70 ? 'text-brand-amber' : 'text-ink'

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
            Axeous / Collect
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">Dashboard</h1>
          <p className="mt-2 text-sm text-ink-dim">
            Multi-view — drop up to 4 watches to monitor live simultaneously.
          </p>
        </div>
        {quota && (
          <div className="rounded-full border border-line bg-glass px-4 py-1.5 text-xs text-ink-faint">
            <span className={callsTone}>{quota.dailyCalls.toLocaleString()}</span>
            <span> / {quota.limit.toLocaleString()} eBay calls today</span>
            <span> · {quota.activeWatches} active</span>
          </div>
        )}
      </header>

      <MultiView />
    </main>
  )
}
