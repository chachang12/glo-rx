import { Tooltip } from 'glo-practice-tester'
import { Surface } from './_frame'

// The popup opens on hover/click (interaction-only), so the static card shows
// the trigger compositions the way the app uses them.
const HelpDot = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      borderRadius: 999,
      border: '1px solid rgba(255,255,255,0.18)',
      fontSize: 11,
      color: '#5b6173',
    }}
  >
    ?
  </span>
)

export const InlineLabel = () => (
  <Surface>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#a7adbd', fontSize: 14 }}>
      Topic mastery
      <Tooltip content="Mastery is an exponential moving average of your recent accuracy on this topic. Answer more questions to raise it.">
        <HelpDot />
      </Tooltip>
    </span>
  </Surface>
)

export const OnText = () => (
  <Surface>
    <span style={{ color: '#a7adbd', fontSize: 14 }}>
      Quota resets at{' '}
      <Tooltip content="Your daily AI generation quota resets at 00:00 UTC.">
        <span style={{ color: '#6aa8ff', cursor: 'help', borderBottom: '1px dashed rgba(106,168,255,0.5)' }}>
          midnight UTC
        </span>
      </Tooltip>
      .
    </span>
  </Surface>
)
