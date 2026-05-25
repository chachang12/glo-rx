import { Link, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { FilterPanel } from '@/features/collect/ebay/components/FilterPanel'
import { useCreateWatch } from '@/features/collect/watches'
import type { SearchFilters } from '@/features/collect/ebay'

export const CollectWatchNew = () => {
  const navigate = useNavigate()
  const create = useCreateWatch()

  const handleSubmit = (filters: SearchFilters) => {
    create.mutate(
      { filters },
      {
        onSuccess: (watch) => {
          navigate(paths.app.collect.watchDetail.getHref(watch.id))
        },
      }
    )
  }

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-12">
      <nav className="mb-4 text-xs text-ink-faint">
        <Link to={paths.app.collect.watches.getHref()} className="hover:text-ink">
          ← All watches
        </Link>
      </nav>
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-dim">
          Axeous / Collect
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">New watch</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Define filters and we'll poll eBay for new matches. You can pause or delete this watch anytime.
        </p>
      </header>

      {create.error && (
        <div className="mb-4 rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-2 text-sm text-brand-coral">
          {create.error instanceof Error ? create.error.message : 'Failed to create watch'}
        </div>
      )}

      <section className="rounded-lg border border-line bg-glass p-5">
        <FilterPanel
          submitLabel={create.isPending ? 'Creating…' : 'Create watch'}
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  )
}
