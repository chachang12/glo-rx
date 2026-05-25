import { useState, type FormEvent } from 'react'
import type {
  EbayBuyingOption,
  EbayCondition,
  EbaySort,
  SearchFilters,
} from '../types/ebay.schema'
import { AspectSelect } from './AspectSelect'

const CONDITIONS: { value: EbayCondition; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'UNSPECIFIED', label: 'Unspecified' },
]

const BUYING_OPTIONS: { value: EbayBuyingOption; label: string }[] = [
  { value: 'FIXED_PRICE', label: 'Buy now' },
  { value: 'AUCTION', label: 'Auction' },
  { value: 'BEST_OFFER', label: 'Best offer' },
]

const SORTS: { value: EbaySort; label: string }[] = [
  { value: 'newlyListed', label: 'Newly listed' },
  { value: 'endingSoonest', label: 'Ending soonest' },
  { value: 'price', label: 'Price: low → high' },
  { value: '-price', label: 'Price: high → low' },
]

interface Props {
  initial?: SearchFilters
  submitLabel: string
  onSubmit: (filters: SearchFilters) => void
}

export function FilterPanel({ initial, submitLabel, onSubmit }: Props) {
  const [q, setQ] = useState(initial?.q ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [priceMin, setPriceMin] = useState(initial?.priceMin?.toString() ?? '')
  const [priceMax, setPriceMax] = useState(initial?.priceMax?.toString() ?? '')
  const [conditions, setConditions] = useState<EbayCondition[]>(initial?.conditions ?? [])
  const [buyingOptions, setBuyingOptions] = useState<EbayBuyingOption[]>(initial?.buyingOptions ?? [])
  const [sort, setSort] = useState<EbaySort | ''>(initial?.sort ?? '')
  const [returnsAccepted, setReturnsAccepted] = useState(initial?.returnsAccepted ?? false)
  const [freeShipping, setFreeShipping] = useState(initial?.maxDeliveryCost === 0)
  const [searchInDescription, setSearchInDescription] = useState(initial?.searchInDescription ?? false)
  const [itemLocationCountry, setItemLocationCountry] = useState(initial?.itemLocationCountry ?? '')
  const [aspects, setAspects] = useState<Record<string, string[]>>(initial?.aspects ?? {})

  const toggle = <T extends string>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const filters: SearchFilters = {
      q: q.trim() || undefined,
      categoryId: categoryId.trim() || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      priceCurrency: priceMin || priceMax ? 'USD' : undefined,
      conditions: conditions.length ? conditions : undefined,
      buyingOptions: buyingOptions.length ? buyingOptions : undefined,
      sort: sort || undefined,
      returnsAccepted: returnsAccepted || undefined,
      maxDeliveryCost: freeShipping ? 0 : undefined,
      searchInDescription: searchInDescription || undefined,
      itemLocationCountry: itemLocationCountry.trim() || undefined,
      aspects: Object.keys(aspects).length ? aspects : undefined,
      limit: 50,
    }
    onSubmit(filters)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Keywords</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="carhartt jacket"
            className="rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink placeholder-ink-faint outline-none focus:border-line-strong"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Category ID</span>
          <input
            type="text"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="e.g. 57988"
            className="rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink placeholder-ink-faint outline-none focus:border-line-strong"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Min price</span>
          <input
            type="number"
            inputMode="decimal"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="0"
            className="rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink placeholder-ink-faint outline-none focus:border-line-strong"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Max price</span>
          <input
            type="number"
            inputMode="decimal"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="100"
            className="rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink placeholder-ink-faint outline-none focus:border-line-strong"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as EbaySort | '')}
            className="rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
          >
            <option value="">Best match</option>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Location</span>
          <input
            type="text"
            value={itemLocationCountry}
            onChange={(e) => setItemLocationCountry(e.target.value)}
            placeholder="US"
            maxLength={2}
            className="rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink placeholder-ink-faint uppercase outline-none focus:border-line-strong"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Condition</span>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => {
              const on = conditions.includes(c.value)
              return (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setConditions((s) => toggle(s, c.value))}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on
                      ? 'border-line-strong bg-glass-strong text-ink'
                      : 'border-line bg-glass text-ink-dim hover:text-ink'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Buying option</span>
          <div className="flex flex-wrap gap-2">
            {BUYING_OPTIONS.map((b) => {
              const on = buyingOptions.includes(b.value)
              return (
                <button
                  type="button"
                  key={b.value}
                  onClick={() => setBuyingOptions((s) => toggle(s, b.value))}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on
                      ? 'border-line-strong bg-glass-strong text-ink'
                      : 'border-line bg-glass text-ink-dim hover:text-ink'
                  }`}
                >
                  {b.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-ink-dim">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={freeShipping}
            onChange={(e) => setFreeShipping(e.target.checked)}
            className="accent-brand-teal"
          />
          Free shipping
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={returnsAccepted}
            onChange={(e) => setReturnsAccepted(e.target.checked)}
            className="accent-brand-teal"
          />
          Returns accepted
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={searchInDescription}
            onChange={(e) => setSearchInDescription(e.target.checked)}
            className="accent-brand-teal"
          />
          Search descriptions
        </label>
      </div>

      {categoryId.trim() && (
        <AspectSelect
          categoryId={categoryId.trim()}
          q={q.trim() || undefined}
          value={aspects}
          onChange={setAspects}
        />
      )}

      <div className="pt-1">
        <button
          type="submit"
          className="rounded-full border border-line-strong bg-glass-strong px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-glass"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
