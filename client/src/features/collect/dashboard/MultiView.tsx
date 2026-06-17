import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { Modal } from '@/features/shared/ui/Modal'
import {
  useGetWatches,
  type Watch,
  type WatchStatus,
} from '@/features/collect/watches'
import { WatchFeed } from '@/features/collect/watches/components/WatchFeed'

const STORAGE_KEY = 'collect-multi-view-v1'
const QUADRANT_COUNT = 4

type Selections = (string | null)[]

function loadSelections(): Selections {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return Array(QUADRANT_COUNT).fill(null)
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return Array(QUADRANT_COUNT).fill(null)
    return Array.from({ length: QUADRANT_COUNT }, (_, i) =>
      typeof parsed[i] === 'string' ? (parsed[i] as string) : null
    )
  } catch {
    return Array(QUADRANT_COUNT).fill(null)
  }
}

function saveSelections(ids: Selections): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    }
  } catch {
    /* storage quota — swallow */
  }
}

export function MultiView() {
  const { data: watches = [], isLoading } = useGetWatches()
  const [selections, setSelections] = useState<Selections>(loadSelections)
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)

  useEffect(() => {
    saveSelections(selections)
  }, [selections])

  // Drop selections that point at deleted/missing watches.
  useEffect(() => {
    if (isLoading) return
    const validIds = new Set(watches.map((w) => w.id))
    setSelections((prev) => {
      const next = prev.map((id) => (id && validIds.has(id) ? id : null))
      const changed = next.some((v, i) => v !== prev[i])
      return changed ? next : prev
    })
  }, [watches, isLoading])

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 sm:grid-rows-2 sm:h-[calc(100vh-220px)] sm:min-h-[640px]">
        {selections.map((watchId, idx) => {
          const watch = watchId ? watches.find((w) => w.id === watchId) ?? null : null
          return (
            <Quadrant
              key={idx}
              watch={watch}
              hasAnyWatches={watches.length > 0}
              isLoading={isLoading}
              onSelect={() => setPickerIndex(idx)}
              onClear={() =>
                setSelections((prev) => prev.map((id, i) => (i === idx ? null : id)))
              }
            />
          )
        })}
      </div>

      {pickerIndex !== null && (
        <WatchPicker
          watches={watches}
          alreadySelected={new Set(selections.filter((v): v is string => !!v))}
          onPick={(id) => {
            setSelections((prev) => prev.map((cur, i) => (i === pickerIndex ? id : cur)))
            setPickerIndex(null)
          }}
          onClose={() => setPickerIndex(null)}
        />
      )}
    </>
  )
}

const STATUS_DOT: Record<WatchStatus, string> = {
  active: 'bg-brand-teal',
  paused: 'bg-ink-faint',
  rate_limited: 'bg-brand-amber',
  error: 'bg-brand-coral',
}

interface QuadrantProps {
  watch: Watch | null
  hasAnyWatches: boolean
  isLoading: boolean
  onSelect: () => void
  onClear: () => void
}

function Quadrant({ watch, hasAnyWatches, isLoading, onSelect, onClear }: QuadrantProps) {
  if (!watch) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-glass p-6 text-center">
        {isLoading ? (
          <p className="text-sm text-ink-faint">Loading…</p>
        ) : hasAnyWatches ? (
          <button
            type="button"
            onClick={onSelect}
            className="rounded-full border border-line-strong bg-glass-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-glass"
          >
            + Select watch
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-dim">No watches yet.</p>
            <Link
              to={paths.app.collect.watchNew.getHref()}
              className="inline-block rounded-full border border-line-strong bg-glass-strong px-4 py-2 text-sm font-medium text-ink hover:bg-glass"
            >
              Create one
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-[300px] flex-col overflow-hidden rounded-lg border border-line bg-glass">
      <header className="flex items-center justify-between gap-2 border-b border-line bg-glass-strong px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[watch.status]}`} />
          <Link
            to={paths.app.collect.watchDetail.getHref(watch.id)}
            className="truncate text-sm font-medium text-ink hover:text-brand-amber"
            title={watch.name}
          >
            {watch.name}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-ink-faint">
          <span title={`${watch.matchCount} total matches`}>{watch.matchCount}</span>
          <button
            type="button"
            onClick={onClear}
            className="grid h-6 w-6 place-items-center rounded-full text-ink-faint transition-colors hover:bg-glass hover:text-ink"
            aria-label="Clear quadrant"
            title="Clear quadrant"
          >
            ✕
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <WatchFeed watchId={watch.id} watchName={watch.name} />
      </div>
    </div>
  )
}

interface PickerProps {
  watches: Watch[]
  alreadySelected: Set<string>
  onPick: (id: string) => void
  onClose: () => void
}

function WatchPicker({ watches, alreadySelected, onPick, onClose }: PickerProps) {
  return (
    <Modal isOpen onClose={onClose} title="Select a watch">
      <p className="mt-1 text-sm text-ink-dim">
        Live-stream the chosen watch into this quadrant.
      </p>

      {watches.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-line bg-glass p-6 text-center text-sm text-ink-dim">
          No watches yet.{' '}
          <Link to={paths.app.collect.watchNew.getHref()} className="underline">
            Create one
          </Link>
          .
        </div>
      ) : (
        <div className="mt-5 max-h-[60vh] space-y-2 overflow-y-auto">
          {watches.map((w) => {
            const inUse = alreadySelected.has(w.id)
            return (
              <button
                type="button"
                key={w.id}
                onClick={() => onPick(w.id)}
                className="block w-full rounded-md border border-line bg-glass px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-glass-strong"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{w.name}</span>
                  {inUse && (
                    <span className="shrink-0 text-[10px] uppercase tracking-widest text-ink-faint">
                      In another quadrant
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-ink-faint">
                  {w.matchCount} match{w.matchCount === 1 ? '' : 'es'} · {w.status}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-full border border-line bg-glass px-4 py-2 text-sm text-ink-dim hover:text-ink"
      >
        Cancel
      </button>
    </Modal>
  )
}
