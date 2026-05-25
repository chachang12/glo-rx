import { useMemo, useState } from 'react'
import {
  useDeletePurchase,
  useGetPurchasesByDate,
  downloadPurchasesCsv,
} from '@/features/collect/purchases'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const CollectAdminPurchases = () => {
  const [date, setDate] = useState(todayIsoDate())
  const { data: purchases = [], isLoading, error } = useGetPurchasesByDate(date)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const deleteMutation = useDeletePurchase()

  const summary = useMemo(() => {
    let total = 0
    for (const p of purchases) {
      const n = Number(p.pricePaid.value)
      if (Number.isFinite(n)) total += n
    }
    const operatorCount = new Set(purchases.map((p) => p.authId)).size
    return { count: purchases.length, total, operatorCount }
  }, [purchases])

  const handleExport = async () => {
    setExportError(null)
    setExporting(true)
    try {
      await downloadPurchasesCsv(date)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Remove "${label}" from the purchase list? This can't be undone.`)) return
    deleteMutation.mutate(id)
  }

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
            Axeous / Collect / Admin
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">Purchases</h1>
          <p className="mt-2 text-sm text-ink-dim">
            What every operator marked as purchased on {formatDay(date)}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-widest text-ink-faint">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
            />
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || purchases.length === 0}
            className="rounded-full border border-line-strong bg-glass-strong px-4 py-2 text-sm font-medium text-ink hover:bg-glass disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Items purchased" value={String(summary.count)} />
        <StatCard label="Total spent" value={`$${summary.total.toFixed(2)}`} accent="amber" />
        <StatCard label="Operators" value={String(summary.operatorCount)} />
        <StatCard
          label="Average"
          value={summary.count > 0 ? `$${(summary.total / summary.count).toFixed(2)}` : '$0.00'}
        />
      </section>

      {exportError && (
        <div className="mb-4 rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {exportError}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {error instanceof Error ? error.message : 'Failed to load purchases'}
        </div>
      )}
      {deleteMutation.error && (
        <div className="mb-4 rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : 'Failed to remove purchase'}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-line bg-glass p-8 text-center text-sm text-ink-dim">
          Loading…
        </div>
      ) : purchases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
          No purchases on {date}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-glass-strong text-xs uppercase tracking-widest text-ink-faint">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Operator</th>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-left font-medium">Watch</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">When</th>
                <th className="px-3 py-2 text-right font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const time = new Date(p.purchasedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const url = p.item.affiliateUrl ?? p.item.webUrl
                const priceNum = Number(p.pricePaid.value)
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-3 py-2 align-top">
                      <div className="text-ink">{p.authName || p.authEmail}</div>
                      {p.authName && <div className="text-xs text-ink-faint">{p.authEmail}</div>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="line-clamp-2 text-ink hover:text-brand-amber"
                      >
                        {p.item.title}
                      </a>
                      {!p.item.affiliateUrl && (
                        <div className="text-[10px] uppercase tracking-widest text-brand-coral/70">
                          no affiliate
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-ink-dim">{p.watchName ?? '—'}</td>
                    <td className="px-3 py-2 align-top text-right text-ink">
                      {Number.isFinite(priceNum) ? `$${priceNum.toFixed(2)}` : p.pricePaid.value}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-ink-faint">{time}</td>
                    <td className="px-3 py-2 align-top text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.item.title)}
                        disabled={deleteMutation.isPending}
                        className="rounded-full border border-brand-coral/30 bg-brand-coral/5 px-2.5 py-1 text-xs text-brand-coral transition-colors hover:bg-brand-coral/10 disabled:opacity-50"
                        aria-label={`Remove ${p.item.title}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'amber'
}) {
  return (
    <div className="rounded-lg border border-line bg-glass p-4">
      <div className="text-xs uppercase tracking-widest text-ink-faint">{label}</div>
      <div
        className={`mt-2 text-2xl font-medium tracking-tight ${
          accent === 'amber' ? 'text-brand-amber' : 'text-ink'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
