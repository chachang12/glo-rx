import { useEffect, useState } from 'react'
import { useGetMe } from '@/features/shared/user'
import { Modal } from '@/features/shared/ui/Modal'
import { useLinkTelegram } from '../api/link'
import { useUnlinkTelegram } from '../api/unlink'

const TelegramIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
  </svg>
)

export function TelegramRow() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: me } = useGetMe({ refetchInterval: modalOpen ? 2000 : undefined })
  const linked = !!me?.telegramChatId

  // Auto-close the modal once the link lands
  useEffect(() => {
    if (modalOpen && linked) setModalOpen(false)
  }, [modalOpen, linked])

  const unlink = useUnlinkTelegram()

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Telegram? You can reconnect anytime.')) return
    await unlink.mutateAsync()
  }

  return (
    <>
      <div className="row-item">
        <div
          className="row-icon"
          style={{
            background: linked ? 'rgba(110,156,199,0.12)' : 'var(--glass)',
            border: `1px solid ${linked ? 'rgba(110,156,199,0.2)' : 'var(--line)'}`,
          }}
        >
          <TelegramIcon color={linked ? 'var(--teal)' : 'var(--ink-dim)'} />
        </div>
        <div className="row-info">
          <div className="row-title">Telegram notifications</div>
          <div className="row-sub">
            {linked ? (
              <>
                Connected{me?.telegramUsername ? ` as @${me.telegramUsername}` : ''} ·
                {' '}you'll get pinged when a watch finds something
              </>
            ) : (
              <>Get pinged the moment a saved watch finds a new listing</>
            )}
          </div>
        </div>
        {linked ? (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={unlink.isPending}
            className="row-action"
          >
            {unlink.isPending ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="row-action"
          >
            Connect
          </button>
        )}
      </div>

      <ConnectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function ConnectModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  return <ConnectModalBody onClose={onClose} />
}

function ConnectModalBody({ onClose }: { onClose: () => void }) {
  const link = useLinkTelegram()
  const [opened, setOpened] = useState(false)

  // Kick off the link request once on mount
  useEffect(() => {
    link.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const data = link.data
  const error = link.error

  return (
    <Modal isOpen onClose={onClose} title="Connect Telegram">
      <p className="mt-1 text-sm text-ink-dim">
        One-tap link — uses Telegram's deep-link flow.
      </p>

      {link.isPending && (
        <div className="mt-6 rounded-md border border-line bg-glass p-4 text-center text-sm text-ink-dim">
          Generating link…
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-md border border-brand-coral/40 bg-brand-coral/5 px-4 py-3 text-sm text-brand-coral">
          {error instanceof Error ? error.message : 'Could not start link flow.'}
        </div>
      )}

      {data && (
        <>
          {data.botStartUrl ? (
            <a
              href={data.botStartUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpened(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d8cc2]"
            >
              <TelegramIcon color="#fff" />
              Open Telegram and tap “Start”
            </a>
          ) : (
            <div className="mt-6 rounded-md border border-brand-amber/40 bg-brand-amber/5 px-4 py-3 text-sm text-brand-amber">
              Bot username not configured. Set TELEGRAM_BOT_USERNAME on the server.
            </div>
          )}

          <div className="mt-5 rounded-md border border-line bg-glass p-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-teal" />
              <span className="text-ink">{opened ? 'Waiting for confirmation…' : 'Then come back here'}</span>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              After you tap “Start” in Telegram, this page will detect the link
              and close on its own. The link expires in 10 minutes.
            </p>
          </div>
        </>
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
