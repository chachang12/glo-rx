// Circular readiness dial. `pct` is clamped 0–100.
export const ReadinessRing = ({ pct }: { pct: number }) => {
  const C = 320 // ~2πr for r=51
  const offset = C - (C * Math.max(0, Math.min(100, pct))) / 100
  return (
    <div className="dial">
      <svg width="122" height="122" viewBox="0 0 122 122" fill="none">
        <circle cx="61" cy="61" r="51" stroke="var(--s-track)" strokeWidth="11" />
        <circle
          cx="61"
          cy="61"
          r="51"
          stroke="var(--teal)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 61 61)"
        />
      </svg>
      <div className="ring-center">
        <span className="ring-num">
          {Math.round(pct)}
          <span className="ring-pct">%</span>
        </span>
        <span className="ring-cap">Ready</span>
      </div>
    </div>
  )
}
