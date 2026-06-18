import type { SessionQuestion } from '../types/session'

interface SessionReviewProps {
  questions: SessionQuestion[]
  answers: Record<string, string[]>
  outcomes: Record<string, boolean>
  correctCount: number
  onDone: () => void
}

function toEntries(options: SessionQuestion['options']): [string, string][] {
  if (!options) return []
  if (Array.isArray(options)) return options.map((v, i) => [String(i), v])
  return Object.entries(options)
}

/** Post-submit review list for "grade at end" mode. */
export const SessionReview = ({ questions, answers, outcomes, correctCount, onDone }: SessionReviewProps) => {
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const scoreColor = score >= 80 ? '#6e9cc7' : score >= 60 ? '#eab308' : '#ff4858'

  return (
    <div className="mx-auto max-w-[540px] space-y-6 px-1 pb-10">
      <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.03] p-8 text-center">
        <p className="font-mono text-5xl font-medium tabular-nums" style={{ color: scoreColor }}>
          {score}%
        </p>
        <p className="mt-3 text-sm text-[#a7adbd]">
          {correctCount} of {questions.length} correct
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#a7adbd]">Review</h2>
        {questions.map((q, i) => {
          const sel = answers[q._id] ?? []
          const correct = outcomes[q._id] ?? false
          const entries = toEntries(q.options)
          const accent = correct ? '#6e9cc7' : '#ff4858'

          return (
            <div
              key={q._id}
              className="space-y-3 rounded-[12px] border p-4"
              style={{
                borderColor: `${accent}33`,
                background: `${accent}0a`,
              }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-bold" style={{ color: accent }}>
                  {correct ? '✓' : '✗'}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="whitespace-pre-line text-sm text-[#dfe3ec]">
                    {i + 1}. {q.stem}
                  </p>
                  <div className="space-y-1">
                    {q.type === 'fib' ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2" style={{ color: accent }}>
                          <span className="w-12 font-mono opacity-60">your:</span>
                          <span>{sel[0] || <em className="opacity-60">(no answer)</em>}</span>
                        </div>
                        {!correct && (
                          <div className="flex items-center gap-2 text-[#6e9cc7]">
                            <span className="w-12 font-mono opacity-60">correct:</span>
                            <span>{q.answer.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ) : q.type === 'ordered' ? (
                      (() => {
                        const byKey = Object.fromEntries(entries) as Record<string, string>
                        const userSeq = sel.map((k) => byKey[k]).filter(Boolean)
                        return (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-start gap-2" style={{ color: accent }}>
                              <span className="w-12 font-mono opacity-60">your:</span>
                              <span>{userSeq.length ? userSeq.join(' → ') : <em className="opacity-60">(no order)</em>}</span>
                            </div>
                            {!correct && (
                              <div className="flex items-start gap-2 text-[#6e9cc7]">
                                <span className="w-12 font-mono opacity-60">correct:</span>
                                <span>{q.answer.join(' → ')}</span>
                              </div>
                            )}
                          </div>
                        )
                      })()
                    ) : (
                      entries.map(([key, text]) => {
                        const isSelected = sel.includes(key)
                        const isAnswer = q.answer.includes(key)
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 rounded px-2 py-1 text-xs"
                            style={{ color: isAnswer ? '#6e9cc7' : isSelected ? '#ff4858' : '#5b6173' }}
                          >
                            <span className="w-4 font-mono">{key.toUpperCase()}.</span>
                            <span>{text}</span>
                            {isAnswer && <span className="text-[10px]">✓</span>}
                            {isSelected && !isAnswer && <span className="text-[10px]">✗</span>}
                          </div>
                        )
                      })
                    )}
                  </div>
                  {q.explanation && (
                    <p className="mt-2 border-t border-white/[0.04] pt-2 text-xs text-[#a7adbd]">{q.explanation}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-[12px] bg-[#6e9cc7] py-3 text-sm font-medium text-[#05060a] transition-all hover:-translate-y-0.5"
      >
        Done
      </button>
    </div>
  )
}
