import { useState } from 'react'
import { useGetMe } from '@/features/shared/user'
import { Modal } from '@/features/shared/ui/Modal'
import { useRedeemAdvancedKey } from '../api/redeem'

const BoltIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
)

export function AdvancedModeRow() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: me } = useGetMe()
  const active = !!me?.advancedCollectMode

  return (
    <>
      <div className="row-item">
        <div
          className="row-icon"
          style={{
            background: active ? 'rgba(255,176,84,0.12)' : 'var(--glass)',
            border: `1px solid ${active ? 'rgba(255,176,84,0.25)' : 'var(--line)'}`,
          }}
        >
          <BoltIcon color={active ? 'var(--amber)' : 'var(--ink-dim)'} />
        </div>
        <div className="row-info">
          <div className="row-title">Advanced mode</div>
          <div className="row-sub">
            {active
              ? '10s eBay polls · up to 4 concurrent watches'
              : 'Faster polls and more concurrent watches. Requires an access key.'}
          </div>
        </div>
        {active ? (
          <span
            className="row-action"
            style={{
              color: 'var(--amber)',
              cursor: 'default',
              borderColor: 'rgba(255,176,84,0.3)',
            }}
          >
            Active
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="row-action"
          >
            Activate
          </button>
        )}
      </div>

      <RedeemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function RedeemModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [key, setKey] = useState('')
  const redeem = useRedeemAdvancedKey()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim() || redeem.isPending) return
    try {
      await redeem.mutateAsync({ key: key.trim() })
      onClose()
    } catch {
      // error rendered below from redeem.error
    }
  }

  const errorMessage =
    redeem.error instanceof Error ? redeem.error.message : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activate advanced mode">
      <p className="mt-1 text-sm text-ink-dim">
        Enter your access key. Unlocks 10s eBay polls and up to 4 concurrent watches.
      </p>

      <form onSubmit={handleSubmit} className="mt-5">
        <input
          type="text"
          autoFocus
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Access key"
          className="w-full rounded-md border border-line bg-glass px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-amber/60 focus:outline-none"
          disabled={redeem.isPending}
        />

        {errorMessage && (
          <div className="mt-3 rounded-md border border-brand-coral/40 bg-brand-coral/5 px-3 py-2 text-sm text-brand-coral">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-line bg-glass px-4 py-2 text-sm text-ink-dim hover:text-ink"
            disabled={redeem.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!key.trim() || redeem.isPending}
            className="flex-1 rounded-full bg-brand-amber px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--amber)' }}
          >
            {redeem.isPending ? 'Activating…' : 'Activate'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
