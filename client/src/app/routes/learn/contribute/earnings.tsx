import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useGetContributorEarnings } from '@/features/learn/contribute'

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`

export const ContributorEarnings = () => {
  const { data, isLoading } = useGetContributorEarnings()

  if (isLoading) return <PageLoader />
  if (!data) return null

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.contribute.queue.getHref()} className="hover:text-[#888]">
              Queue
            </Link>
            <span>/</span>
            <span className="text-[#888]">Earnings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Earnings</h1>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Card label="Pending" value={fmtUsd(data.pendingTotalCents)} />
          <Card label="Paid (lifetime)" value={fmtUsd(data.paidTotalCents)} />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#bbb]">Pending by exam</h2>
          {data.pendingByExam.length === 0 ? (
            <p className="text-xs text-[#555]">No pending reviews.</p>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {data.pendingByExam.map((row) => (
                <div
                  key={row.examCode}
                  className="px-4 py-3 grid grid-cols-3 items-center text-xs"
                >
                  <span className="text-[#ddd] font-mono uppercase">{row.examCode}</span>
                  <span className="text-[#888] text-center tabular-nums">
                    {row.pendingCount} review{row.pendingCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-[#bbb] text-right tabular-nums">
                    {fmtUsd(row.pendingCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#bbb]">Payouts</h2>
          {data.payouts.length === 0 ? (
            <p className="text-xs text-[#555]">No payouts generated yet.</p>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {data.payouts.map((p) => (
                <div key={p._id} className="px-4 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#ddd] tabular-nums">
                      {new Date(p.periodStart).toLocaleDateString()} –{' '}
                      {new Date(p.periodEnd).toLocaleDateString()}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold ${
                        p.status === 'paid'
                          ? 'bg-[#10b981]/10 text-[#10b981]'
                          : p.status === 'reversed'
                            ? 'bg-[#ef4444]/10 text-[#ef4444]'
                            : 'bg-white/[0.04] text-[#888]'
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="ml-auto text-[#bbb] tabular-nums">
                      {fmtUsd(p.amountCents)}
                    </span>
                  </div>
                  {p.perExamBreakdown.length > 0 && (
                    <ul className="mt-1 text-[10px] text-[#555] space-y-0.5">
                      {p.perExamBreakdown.map((b) => (
                        <li key={b.examCode}>
                          {b.examCode}: {b.reviewCount} × {fmtUsd(b.rateCents)} ={' '}
                          {fmtUsd(b.amountCents)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const Card = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
    <div className="text-[10px] uppercase tracking-wide text-[#555]">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-[#e8e6f0] tabular-nums">{value}</div>
  </div>
)
