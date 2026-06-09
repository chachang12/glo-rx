import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useGetContributorMe } from '@/features/learn/contribute'

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`

export const ContributorMe = () => {
  const { data, isLoading } = useGetContributorMe()

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
            <span className="text-[#888]">Profile</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            {data.firstName} {data.lastName}
          </h1>
          <p className="text-xs text-[#555]">Contributor profile</p>
        </header>

        <div className="grid grid-cols-3 gap-4">
          <Card label="Today's reviews" value={`${data.billableToday} / ${data.dailyCap}`} />
          <Card label="Reliability" value={`${(data.reliabilityScore * 100).toFixed(0)}%`} />
          <Card label="Min dwell" value={`${Math.round(data.minDwellMs / 1000)}s`} />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#bbb]">Scopes</h2>
          {data.scopes.length === 0 ? (
            <p className="text-xs text-[#555]">No scopes — contact admin.</p>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {data.scopes.map((s) => (
                <div
                  key={s.examCode}
                  className="px-4 py-3 grid grid-cols-2 items-center text-xs"
                >
                  <span className="text-[#ddd] font-mono uppercase">{s.examCode}</span>
                  <span className="text-[#888] text-right tabular-nums">
                    {fmtUsd(s.rateCents)} / review
                  </span>
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
    <div className="mt-1 text-xl font-semibold text-[#e8e6f0] tabular-nums">{value}</div>
  </div>
)
