import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { FilterPanel } from '@/features/collect/ebay/components/FilterPanel'
import { parseEbaySearchUrl, type SearchFilters } from '@/features/collect/ebay'
import { useCreateWatch } from '@/features/collect/watches'

export const CollectWatchNew = () => {
  const navigate = useNavigate()
  const create = useCreateWatch()

  const [urlInput, setUrlInput] = useState('')
  const [initial, setInitial] = useState<SearchFilters | undefined>(undefined)
  const [panelKey, setPanelKey] = useState(0)
  const [importNote, setImportNote] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const handleImport = () => {
    const parsed = parseEbaySearchUrl(urlInput)
    if (!parsed) {
      setImportNote({ kind: 'err', msg: 'Couldn\'t parse that URL — paste an eBay search URL from ebay.com/sch/i.html.' })
      return
    }
    setInitial(parsed)
    setPanelKey((k) => k + 1)
    const fields = Object.keys(parsed).length
    setImportNote({ kind: 'ok', msg: `Imported ${fields} filter field${fields === 1 ? '' : 's'} — adjust below and submit.` })
  }

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

      <section className="mb-4 rounded-lg border border-line bg-glass p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="ebay-url" className="text-xs uppercase tracking-widest text-ink-faint">
            Import from eBay URL
          </label>
          <span className="text-xs text-ink-faint">
            Optional — paste a saved eBay search to pre-fill the filters below
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="ebay-url"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.ebay.com/sch/i.html?_nkw=…"
            className="flex-1 rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink placeholder-ink-faint outline-none focus:border-line-strong"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={!urlInput.trim()}
            className="rounded-full border border-line-strong bg-glass-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-glass disabled:opacity-50"
          >
            Import
          </button>
        </div>
        {importNote && (
          <p
            className={`mt-2 text-xs ${
              importNote.kind === 'ok' ? 'text-brand-teal' : 'text-brand-coral'
            }`}
          >
            {importNote.msg}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-glass p-5">
        <FilterPanel
          key={panelKey}
          initial={initial}
          submitLabel={create.isPending ? 'Creating…' : 'Create watch'}
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  )
}
