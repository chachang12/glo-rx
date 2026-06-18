interface FeedbackPanelProps {
  isCorrect: boolean
  timedOut: boolean
  title: string
  explanation?: string
  /** Shown for misses so the learner sees the right answer inline. */
  correctAnswerText?: string
  /** When true, render the "Explain with AI Tutor" button (misses only). */
  showTutorButton: boolean
  onOpenTutor: () => void
}

/**
 * Result panel shown after a question is revealed (instant mode). XP is omitted.
 * The basic explanation is the question's own text; the AI Tutor button opens a
 * deeper, generated breakdown.
 */
export const FeedbackPanel = ({
  isCorrect,
  timedOut,
  title,
  explanation,
  correctAnswerText,
  showTutorButton,
  onOpenTutor,
}: FeedbackPanelProps) => {
  const accent = isCorrect ? '#6e9cc7' : '#ff4858'
  const icon = isCorrect ? '✓' : timedOut ? '⏱' : '✗'

  return (
    <div
      className="quiz-fade-up flex flex-col gap-3 rounded-[12px] border bg-white/[0.03] px-[22px] py-5"
      style={{ borderColor: isCorrect ? 'rgba(110,156,199,0.2)' : 'rgba(255,72,88,0.18)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] text-base"
          style={{ background: `${accent}26`, color: accent }}
        >
          {icon}
        </div>
        <div className="text-[15px] font-medium" style={{ color: accent }}>
          {title}
        </div>
      </div>

      {explanation && <div className="text-[13.5px] leading-relaxed text-[#a7adbd]">{explanation}</div>}

      {!isCorrect && correctAnswerText && (
        <div className="mt-1 flex items-start gap-2 rounded-[10px] border border-[#6e9cc7]/15 bg-[#6e9cc7]/[0.07] px-3.5 py-2.5 text-[13px] leading-snug text-[#a7adbd]">
          <span className="whitespace-nowrap pt-px font-mono text-[10px] uppercase tracking-wider text-[#6e9cc7]">
            Correct
          </span>
          <span>{correctAnswerText}</span>
        </div>
      )}

      {showTutorButton && (
        <button
          type="button"
          onClick={onOpenTutor}
          className="flex w-fit items-center gap-2 rounded-[10px] border border-[#a78bfa]/20 bg-[#a78bfa]/[0.08] px-3.5 py-2.5 text-[13px] font-medium text-[#a78bfa] transition-all hover:-translate-y-px hover:border-[#a78bfa]/30 hover:bg-[#a78bfa]/[0.14] active:scale-[0.97]"
        >
          <span className="text-sm">✦</span> Explain with AI Tutor
        </button>
      )}
    </div>
  )
}
