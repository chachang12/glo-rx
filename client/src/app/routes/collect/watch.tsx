import { useState } from 'react'
import { FilterPanel } from '@/features/collect/ebay/components/FilterPanel'
import { WatchFeed } from '@/features/collect/ebay/components/WatchFeed'
import type { SearchFilters } from '@/features/collect/ebay'

export const CollectWatch = () => {
  const [filters, setFilters] = useState<SearchFilters | null>(null)

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-12">
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
          Axeous / Collect
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">Live watch</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Stream newly listed items as they appear on eBay. Up to 3 concurrent watches per server.
        </p>
      </header>

      <section className="rounded-lg border border-line bg-glass p-5">
        <FilterPanel
          submitLabel={filters ? 'Restart watch' : 'Start watch'}
          onSubmit={setFilters}
        />
      </section>

      <section className="mt-6">
        <WatchFeed filters={filters} onStop={() => setFilters(null)} />
      </section>
    </main>
  )
}
