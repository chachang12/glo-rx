interface SessionHudProps {
  index: number
  total: number
  topic: string
  streak: number
  /** Live accuracy 0–100, or null before anything is graded (end mode / first Q). */
  accuracy: number | null
  onExit: () => void
}

/**
 * Top bar: exit, progress, and the live streak / accuracy chips. XP is
 * intentionally omitted. All values are session-derived (never fabricated).
 */
export const SessionHud = ({ index, total, topic, streak, accuracy, onExit }: SessionHudProps) => {
  const pct = total > 0 ? (index / total) * 100 : 0

  return (
    <div className="flex items-center gap-3 pt-1 pb-2">
      <button
        onClick={onExit}
        title="Exit session"
        aria-label="Exit session"
        className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] text-[15px] text-[#5b6173] transition-colors hover:border-white/[0.13] hover:bg-white/[0.07] hover:text-[#a7adbd] active:scale-95"
      >
        ✕
      </button>

      <div className="flex-1">
        <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[#6e9cc7] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%`, boxShadow: '0 0 10px rgba(110,156,199,0.45)' }}
          />
        </div>
        <div className="mt-[5px] flex items-center justify-between">
          <span className="font-mono text-[10.5px] tracking-wide text-[#5b6173]">
            {index + 1} / {total}
          </span>
          <span className="max-w-[160px] truncate font-mono text-[10.5px] tracking-wide text-[#5b6173]">
            {topic}
          </span>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5">
        <div className="flex items-center gap-1.5 rounded-full border border-[#6e9cc7]/20 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#6e9cc7]">
          <span
            className="h-[5px] w-[5px] rounded-full bg-[#6e9cc7]"
            style={{ boxShadow: '0 0 5px rgba(110,156,199,0.7)' }}
          />
          <span>{streak}</span>
        </div>
        <div className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#a7adbd]">
          {accuracy === null ? '—' : `${accuracy}%`}
        </div>
      </div>
    </div>
  )
}
