import { useEffect, useRef, useState } from 'react'
import type { CompactItem } from '@/features/collect/ebay/types/ebay.schema'
import { useCreatePurchase } from '../api/create-purchase'

interface Props {
  item: CompactItem
  watchId?: string
  watchName?: string
  /** True when this item has already been marked by someone (any operator). */
  alreadyPurchased?: boolean
}

export function ItemMenu({ item, watchId, watchName, alreadyPurchased }: Props) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const mutation = useCreatePurchase()
  const purchased = done || alreadyPurchased

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handlePurchase = () => {
    mutation.mutate(
      { item, watchId, watchName },
      {
        onSuccess: () => {
          setDone(true)
          setTimeout(() => setOpen(false), 900)
        },
      }
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Item actions"
        title={purchased ? 'Already purchased' : 'Actions'}
        className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
          purchased
            ? 'bg-brand-teal text-surface'
            : 'border border-line bg-glass-strong text-ink-dim hover:text-ink'
        }`}
      >
        {purchased ? <CheckIcon /> : <DotsIcon />}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-md border border-line shadow-xl"
          style={{ background: 'var(--bg)' }}
        >
          {alreadyPurchased && !done ? (
            <>
              <div className="border-b border-line px-3 py-2 text-xs text-ink-faint">
                Already marked as purchased by an operator.
              </div>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={handlePurchase}
                className="block w-full px-3 py-2 text-left text-sm text-ink-dim hover:bg-glass-strong hover:text-ink disabled:opacity-50"
              >
                {mutation.isPending ? 'Marking…' : 'Mark anyway'}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={mutation.isPending || done}
              onClick={handlePurchase}
              className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-glass-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {done
                ? '✓ Marked purchased'
                : mutation.isPending
                ? 'Marking…'
                : 'Mark as purchased'}
            </button>
          )}
          {mutation.error && !done && (
            <p className="border-t border-line px-3 py-1.5 text-xs text-brand-coral">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12l4 4 10-10" />
  </svg>
)
