import { useState } from 'react'
import { FilterPanel } from '@/features/collect/ebay/components/FilterPanel'
import { ResultCard } from '@/features/collect/ebay/components/ResultCard'
import { useSearchEbay, type SearchFilters } from '@/features/collect/ebay'

export const CollectSearch = () => {
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const { data, isFetching, error } = useSearchEbay(filters)

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-12">
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
          Axeous / Collect
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">Search</h1>
        <p className="mt-2 text-sm text-ink-dim">
          One-shot eBay search. Affiliate URLs are used when present.
        </p>
      </header>

      <section className="rounded-lg border border-line bg-glass p-5">
        <FilterPanel submitLabel="Search" onSubmit={setFilters} />
      </section>

      <section className="mt-6">
        {error && (
          <div className="rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
            {error instanceof Error ? error.message : 'Search failed'}
          </div>
        )}

        {!filters && (
          <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
            Enter filters above and submit to see results.
          </div>
        )}

        {filters && isFetching && (
          <div className="rounded-lg border border-line bg-glass p-8 text-center text-sm text-ink-dim">
            Searching eBay…
          </div>
        )}

        {filters && data && !isFetching && (
          <>
            <div className="mb-3 flex items-baseline justify-between text-xs text-ink-faint">
              <span>{data.total.toLocaleString()} total matches</span>
              <span>showing {data.items.length}</span>
            </div>
            {data.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line bg-glass p-8 text-center text-sm text-ink-dim">
                No items match these filters.
              </div>
            ) : (
              <div className="space-y-2">
                {data.items.map((item) => (
                  <ResultCard key={item.itemId} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
