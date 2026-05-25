import { useGetEbayAspects } from '../api/get-aspects'

interface Props {
  categoryId: string
  q?: string
  value: Record<string, string[]>
  onChange: (next: Record<string, string[]>) => void
}

export function AspectSelect({ categoryId, q, value, onChange }: Props) {
  const { data, isLoading, error } = useGetEbayAspects(categoryId, q)

  if (isLoading) {
    return <p className="text-xs text-ink-faint">Loading category aspects…</p>
  }
  if (error) {
    return (
      <p className="text-xs text-brand-coral">
        Could not load aspects for category {categoryId}.
      </p>
    )
  }

  const distributions = data?.aspectDistributions ?? []
  if (distributions.length === 0) {
    return (
      <p className="text-xs text-ink-faint">
        No aspects available for category {categoryId}.
      </p>
    )
  }

  const toggle = (aspectName: string, aspectValue: string) => {
    const current = value[aspectName] ?? []
    const next = current.includes(aspectValue)
      ? current.filter((v) => v !== aspectValue)
      : [...current, aspectValue]
    const cloned = { ...value }
    if (next.length === 0) delete cloned[aspectName]
    else cloned[aspectName] = next
    onChange(cloned)
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs uppercase tracking-widest text-ink-faint">Aspects</span>
      <div className="space-y-3">
        {distributions.map((dist) => {
          const selected = value[dist.localizedAspectName] ?? []
          const values = dist.aspectValueDistributions.slice(0, 12)
          return (
            <div key={dist.localizedAspectName}>
              <div className="mb-1.5 text-xs text-ink-dim">{dist.localizedAspectName}</div>
              <div className="flex flex-wrap gap-1.5">
                {values.map((v) => {
                  const on = selected.includes(v.localizedAspectValue)
                  return (
                    <button
                      key={v.localizedAspectValue}
                      type="button"
                      onClick={() => toggle(dist.localizedAspectName, v.localizedAspectValue)}
                      className={`rounded-sm border px-2 py-0.5 text-[11px] transition-colors ${
                        on
                          ? 'border-line-strong bg-glass-strong text-ink'
                          : 'border-line bg-glass text-ink-dim hover:text-ink'
                      }`}
                    >
                      {v.localizedAspectValue}
                      <span className="ml-1 text-ink-faint">({v.matchCount})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
