import { Modal } from 'glo-practice-tester'
import { Surface } from './_frame'

const noop = () => {}

// Modal renders into document.body as a full-screen fixed overlay (dimmed
// backdrop, centered panel). In the preview card it covers the card area; that
// is expected. See learnings: may need cfg.overrides.Modal cardMode/viewport.

export const ResetProgress = () => (
  <Surface style={{ minHeight: 360 }}>
    <Modal isOpen onClose={noop} title="Reset progress?">
      <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft, #a7adbd)' }}>
        This permanently clears your mastery, streak, and answered-question
        history for <strong style={{ color: 'var(--ink)' }}>NCLEX-RN</strong>. Your
        study plan stays, but every topic returns to 0% mastery. This cannot be
        undone.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={noop}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md, 10px)',
            border: '1px solid var(--line, rgba(255,255,255,0.1))',
            background: 'transparent',
            color: 'var(--ink)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={noop}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md, 10px)',
            border: 'none',
            background: 'var(--coral, #ff4858)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reset progress
        </button>
      </div>
    </Modal>
  </Surface>
)

export const UpgradePrompt = () => (
  <Surface style={{ minHeight: 360 }}>
    <Modal isOpen onClose={noop} title="Daily limit reached">
      <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft, #a7adbd)' }}>
        You have used all 50 free AI generations for today. Your quota resets at
        midnight UTC, or upgrade to Pro for 500 generations per day plus ABG
        vignette drills.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={noop}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md, 10px)',
            border: '1px solid var(--line, rgba(255,255,255,0.1))',
            background: 'transparent',
            color: 'var(--ink)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
        <button
          type="button"
          onClick={noop}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md, 10px)',
            border: 'none',
            background: 'linear-gradient(135deg, var(--teal, #2dd4bf), var(--blue, #6aa8ff))',
            color: '#04120f',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Upgrade to Pro
        </button>
      </div>
    </Modal>
  </Surface>
)
