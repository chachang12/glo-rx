import { type CSSProperties, type ReactNode } from 'react'

// Axeous is dark-first. The preview-card HTML chrome defaults to a white body,
// but every component is styled for the dark app surface (near-white text on
// var(--bg)). Wrap each preview in <Surface> so the card shows the component on
// its real background. (Real designs already get body{background:var(--bg)} from
// styles.css — this only fixes the preview cards.)
export const Surface = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      background: 'var(--bg)',
      color: 'var(--ink)',
      padding: 28,
      fontFamily: "'Geist', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
      ...style,
    }}
  >
    {children}
  </div>
)
