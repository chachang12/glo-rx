interface QuestionTimerProps {
  timeLeft: number
  totalSeconds: number
}

/** Thin per-question countdown bar. Turns coral in the final 15 seconds. */
export const QuestionTimer = ({ timeLeft, totalSeconds }: QuestionTimerProps) => {
  const pct = totalSeconds > 0 ? Math.max(0, (timeLeft / totalSeconds) * 100) : 0
  const warn = timeLeft <= 15
  const m = Math.floor(Math.max(0, timeLeft) / 60)
  const s = Math.max(0, timeLeft) % 60

  return (
    <div className="mb-4">
      <div className="h-[2px] overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: warn ? '#ff4858' : '#6e9cc7',
            boxShadow: warn ? '0 0 6px rgba(255,72,88,0.5)' : undefined,
          }}
        />
      </div>
      <div className="mt-1 flex justify-end">
        <span
          className="font-mono text-[10.5px] transition-colors"
          style={{ color: warn ? '#ff4858' : '#5b6173' }}
        >
          {m}:{s.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
