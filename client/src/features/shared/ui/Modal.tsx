import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

interface ModalProps {
  /** Whether the modal is rendered. */
  isOpen: boolean
  /** Called on backdrop click, Escape, or the close button. */
  onClose: () => void
  /** Optional heading rendered at the top of the panel. */
  title?: ReactNode
  children: ReactNode
}

/**
 * Shared portal modal: dimmed backdrop with click-to-close, Escape-to-close,
 * and a top-right close button. Renders into document.body so it escapes any
 * overflow/stacking context of the triggering row.
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="shared-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="shared-modal-panel relative w-full max-w-md border border-line bg-surface p-6"
        style={{ background: 'var(--bg)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-ink-faint hover:text-ink"
        >
          ✕
        </button>

        {title != null && <h2 className="text-lg font-medium text-ink">{title}</h2>}

        {children}
      </div>
    </div>,
    document.body,
  )
}
