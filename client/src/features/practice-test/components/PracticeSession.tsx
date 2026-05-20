import { useState, useCallback, useRef, useMemo } from 'react'
import { isCorrect } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionQuestion {
  _id: string
  type: 'mcq' | 'sata' | 'ordered' | 'calculation' | 'exhibit' | 'priority' | 'fib'
  stem: string
  options: Record<string, string> | string[]
  answer: string[]
  explanation?: string
  topics?: string[]
  difficulty?: string
}

const SINGLE_ANSWER_TYPES = new Set(['mcq', 'calculation', 'exhibit', 'priority'])

interface PracticeSessionProps {
  questions: SessionQuestion[]
  title: string
  gradingMode: 'instant' | 'end'
  onComplete: (results: SessionResults) => void
  onExit: () => void
}

export interface SessionResults {
  totalQuestions: number
  correctCount: number
  answers: { questionId: string; selected: string[]; correct: boolean; timeMs: number }[]
  durationMs: number
}

type AnswerMap = Record<string, string[]>
type RevealMap = Record<string, boolean>

// ── Component ────────────────────────────────────────────────────────────────

export const PracticeSession = ({
  questions,
  title,
  gradingMode,
  onComplete,
  onExit,
}: PracticeSessionProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [revealed, setRevealed] = useState<RevealMap>({})
  const [submitted, setSubmitted] = useState(false) // for 'end' mode final submit
  const questionStartTime = useRef(Date.now())
  const sessionStartTime = useRef(Date.now())
  const timings = useRef<Record<string, number>>({})

  const question = questions[currentIndex]
  const qId = question._id
  const selected = answers[qId] ?? []
  const isRevealed = revealed[qId] ?? false
  const isLast = currentIndex === questions.length - 1
  // FIB stores options as {} server-side; Mongoose Schema.Types.Mixed can drop
  // an empty object before it reaches the client, so guard against null/undefined.
  const optionEntries: [string, string][] = !question.options
    ? []
    : Array.isArray(question.options)
    ? question.options.map((v, i) => [String(i), v] as [string, string])
    : Object.entries(question.options)

  // Adapt to isCorrect utility shape
  const questionForGrading = useMemo(() => ({
    id: 0,
    type: question.type,
    stem: question.stem,
    options: question.options as Record<string, string>,
    answer: question.answer,
  }), [question])

  const handleSelect = useCallback((option: string) => {
    if (isRevealed) return

    setAnswers((prev) => {
      const current = prev[qId] ?? []

      if (SINGLE_ANSWER_TYPES.has(question.type)) {
        return { ...prev, [qId]: [option] }
      }

      if (question.type === 'ordered') {
        // Append in click order; clicking an already-sequenced item removes it
        // (and everything after, so the sequence stays contiguous-from-the-top).
        const idx = current.indexOf(option)
        if (idx >= 0) {
          return { ...prev, [qId]: current.slice(0, idx) }
        }
        return { ...prev, [qId]: [...current, option] }
      }

      // sata — toggle
      if (current.includes(option)) {
        return { ...prev, [qId]: current.filter((o) => o !== option) }
      }
      return { ...prev, [qId]: [...current, option] }
    })
  }, [qId, question.type, isRevealed])

  const handleFibChange = useCallback((value: string) => {
    if (isRevealed) return
    setAnswers((prev) => ({ ...prev, [qId]: [value] }))
  }, [qId, isRevealed])

  const handleSubmitAnswer = useCallback(() => {
    const elapsed = Date.now() - questionStartTime.current
    timings.current[qId] = elapsed

    if (gradingMode === 'instant') {
      setRevealed((prev) => ({ ...prev, [qId]: true }))
    }
  }, [qId, gradingMode])

  const handleNext = useCallback(() => {
    // If instant mode and not yet submitted, submit first
    if (gradingMode === 'instant' && !isRevealed && selected.length > 0) {
      handleSubmitAnswer()
      return
    }

    if (!isLast) {
      setCurrentIndex((i) => i + 1)
      questionStartTime.current = Date.now()
    }
  }, [gradingMode, isRevealed, selected, isLast, handleSubmitAnswer])

  const handleFinish = useCallback(() => {
    // Submit current answer if not yet
    if (selected.length > 0 && !timings.current[qId]) {
      timings.current[qId] = Date.now() - questionStartTime.current
    }

    if (gradingMode === 'end') {
      // Reveal all answers
      const allRevealed: RevealMap = {}
      for (const q of questions) allRevealed[q._id] = true
      setRevealed(allRevealed)
      setSubmitted(true)
      return
    }

    // Compile results
    const results = buildResults()
    onComplete(results)
  }, [qId, selected, gradingMode, questions, onComplete])

  const handleViewResults = useCallback(() => {
    const results = buildResults()
    onComplete(results)
  }, [onComplete])

  const buildResults = useCallback((): SessionResults => {
    const resultAnswers = questions.map((q) => {
      const sel = answers[q._id] ?? []
      const qForGrade = {
        id: 0,
        type: q.type as 'mcq' | 'sata' | 'ordered' | 'calculation' | 'exhibit',
        stem: q.stem,
        options: q.options as Record<string, string>,
        answer: q.answer,
      }
      return {
        questionId: q._id,
        selected: sel,
        correct: isCorrect(qForGrade, sel),
        timeMs: timings.current[q._id] ?? 0,
      }
    })

    return {
      totalQuestions: questions.length,
      correctCount: resultAnswers.filter((a) => a.correct).length,
      answers: resultAnswers,
      durationMs: Date.now() - sessionStartTime.current,
    }
  }, [questions, answers])

  // End mode — show review after final submit
  if (gradingMode === 'end' && submitted) {
    const results = buildResults()
    const score = Math.round((results.correctCount / results.totalQuestions) * 100)

    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Score header */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center space-y-3">
            <p className="text-5xl font-bold tabular-nums" style={{ color: score >= 80 ? '#10b981' : score >= 60 ? '#eab308' : '#ef4444' }}>
              {score}%
            </p>
            <p className="text-sm text-[#888]">
              {results.correctCount} of {results.totalQuestions} correct
            </p>
          </div>

          {/* Question review */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#bbb]">Review</h2>
            {questions.map((q, i) => {
              const sel = answers[q._id] ?? []
              const qForGrade = {
                id: 0, type: q.type,
                stem: q.stem, options: q.options as Record<string, string>, answer: q.answer,
              }
              const correct = isCorrect(qForGrade, sel)
              const entries: [string, string][] = !q.options
                ? []
                : Array.isArray(q.options)
                ? q.options.map((v, j) => [String(j), v] as [string, string])
                : Object.entries(q.options)

              return (
                <div key={q._id} className={`rounded-xl border p-4 space-y-3 ${correct ? 'border-[#10b981]/20 bg-[#10b981]/[0.03]' : 'border-[#ef4444]/20 bg-[#ef4444]/[0.03]'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-bold mt-0.5 ${correct ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {correct ? '✓' : '✗'}
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-[#ddd] whitespace-pre-line">{i + 1}. {q.stem}</p>
                      <div className="space-y-1">
                        {q.type === 'fib' ? (
                          <div className="text-xs space-y-1">
                            <div className={`flex items-center gap-2 ${correct ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                              <span className="font-mono w-12 opacity-60">your:</span>
                              <span>{sel[0] || <em className="opacity-60">(no answer)</em>}</span>
                            </div>
                            {!correct && (
                              <div className="flex items-center gap-2 text-[#10b981]">
                                <span className="font-mono w-12 opacity-60">correct:</span>
                                <span>{q.answer.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ) : q.type === 'ordered' ? (
                          (() => {
                            const optionsByKey = Object.fromEntries(entries) as Record<string, string>
                            const userSeq = sel.map((k) => optionsByKey[k]).filter(Boolean)
                            return (
                              <div className="text-xs space-y-1">
                                <div className={`flex items-start gap-2 ${correct ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                  <span className="font-mono w-12 opacity-60">your:</span>
                                  <span>{userSeq.length ? userSeq.join(' → ') : <em className="opacity-60">(no order)</em>}</span>
                                </div>
                                {!correct && (
                                  <div className="flex items-start gap-2 text-[#10b981]">
                                    <span className="font-mono w-12 opacity-60">correct:</span>
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
                              <div key={key} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                                isAnswer ? 'text-[#10b981]' : isSelected ? 'text-[#ef4444]' : 'text-[#555]'
                              }`}>
                                <span className="font-mono w-4">{key}.</span>
                                <span>{text}</span>
                                {isAnswer && <span className="text-[10px]">✓</span>}
                                {isSelected && !isAnswer && <span className="text-[10px]">✗</span>}
                              </div>
                            )
                          })
                        )}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-[#888] border-t border-white/[0.04] pt-2 mt-2">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleViewResults}
            className="w-full py-3 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Main question view ──────────────────────────────────────────────────

  const answeredCorrectly = isRevealed && isCorrect(questionForGrading, selected)

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="text-xs text-[#555] hover:text-[#888] transition-colors"
            >
              &larr; Exit
            </button>
            <span className="text-xs text-[#555]">|</span>
            <span className="text-xs text-[#888] truncate max-w-48">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#555]">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-[#4f8ef7] transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 space-y-6">
          {/* Meta */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">
              {question.type === 'fib' ? 'FILL-IN' : question.type === 'priority' ? 'PRIORITY' : question.type}
            </span>
            {question.difficulty && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                question.difficulty === 'hard' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                question.difficulty === 'medium' ? 'bg-[#eab308]/10 text-[#eab308]' :
                'bg-[#10b981]/10 text-[#10b981]'
              }`}>
                {question.difficulty}
              </span>
            )}
            {question.type === 'sata' && (
              <span className="text-[10px] text-[#888]">Select all that apply</span>
            )}
            {question.type === 'priority' && (
              <span className="text-[10px] text-[#888]">Pick the highest priority</span>
            )}
            {question.type === 'ordered' && (
              <span className="text-[10px] text-[#888]">Click in correct order</span>
            )}
            {question.type === 'fib' && (
              <span className="text-[10px] text-[#888]">Type your answer</span>
            )}
          </div>

          {/* Stem */}
          <p className="text-[#e8e6f0] leading-relaxed whitespace-pre-line">{question.stem}</p>

          {/* Render the answer surface per type */}
          {question.type === 'ordered' ? (
            <OrderedSequence
              optionEntries={optionEntries}
              selected={selected}
              answer={question.answer}
              isRevealed={isRevealed}
              onPick={handleSelect}
            />
          ) : question.type === 'fib' ? (
            <FibInput
              value={selected[0] ?? ''}
              onChange={handleFibChange}
              acceptedAnswers={question.answer}
              isRevealed={isRevealed}
              isCorrect={isCorrect(questionForGrading, selected)}
            />
          ) : (
            <div className="space-y-2">
              {optionEntries.map(([key, text]) => {
                const isSelected = selected.includes(key)
                const isAnswer = question.answer.includes(key)

                let style = 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] text-[#ddd]'
                if (isSelected && !isRevealed) {
                  style = 'border-[#4f8ef7]/40 bg-[#4f8ef7]/10 text-[#e8e6f0]'
                }
                if (isRevealed) {
                  if (isAnswer) {
                    style = 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'
                  } else if (isSelected) {
                    style = 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]'
                  } else {
                    style = 'border-white/[0.04] bg-transparent text-[#555]'
                  }
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    disabled={isRevealed}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${style} disabled:cursor-default`}
                  >
                    <span className="w-6 h-6 rounded-md border border-current/20 flex items-center justify-center text-xs font-mono flex-shrink-0">
                      {isRevealed && isAnswer ? '✓' : isRevealed && isSelected ? '✗' : key.toUpperCase()}
                    </span>
                    <span className="text-sm">{text}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Feedback (instant mode) */}
          {isRevealed && (
            <div className={`rounded-lg p-3 ${answeredCorrectly ? 'bg-[#10b981]/10 border border-[#10b981]/20' : 'bg-[#ef4444]/10 border border-[#ef4444]/20'}`}>
              <p className={`text-xs font-semibold ${answeredCorrectly ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {answeredCorrectly ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              {question.explanation && (
                <p className="text-xs text-[#888] mt-2">{question.explanation}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#555]">
            {question.topics && question.topics.length > 0 && (
              <span>{question.topics.join(', ')}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {gradingMode === 'instant' && !isRevealed && (
              <button
                onClick={handleSubmitAnswer}
                disabled={selected.length === 0}
                className="px-5 py-2.5 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            )}

            {gradingMode === 'instant' && isRevealed && !isLast && (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
              >
                Next
              </button>
            )}

            {gradingMode === 'instant' && isRevealed && isLast && (
              <button
                onClick={handleFinish}
                className="px-5 py-2.5 rounded-xl bg-[#10b981] text-[#0f0f1a] text-sm font-semibold hover:bg-[#10b981]/90 transition-all"
              >
                Finish
              </button>
            )}

            {gradingMode === 'end' && !isLast && (
              <button
                onClick={() => {
                  if (selected.length > 0 && !timings.current[qId]) {
                    timings.current[qId] = Date.now() - questionStartTime.current
                  }
                  setCurrentIndex((i) => i + 1)
                  questionStartTime.current = Date.now()
                }}
                disabled={selected.length === 0}
                className="px-5 py-2.5 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}

            {gradingMode === 'end' && isLast && (
              <button
                onClick={handleFinish}
                disabled={selected.length === 0}
                className="px-5 py-2.5 rounded-xl bg-[#10b981] text-[#0f0f1a] text-sm font-semibold hover:bg-[#10b981]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Ordered sequence builder ─────────────────────────────────────────────────

interface OrderedSequenceProps {
  optionEntries: [string, string][]
  selected: string[]
  answer: string[]
  isRevealed: boolean
  onPick: (key: string) => void
}

const OrderedSequence = ({ optionEntries, selected, answer, isRevealed, onPick }: OrderedSequenceProps) => {
  const optionsByKey = Object.fromEntries(optionEntries) as Record<string, string>
  const available = optionEntries.filter(([k]) => !selected.includes(k))
  const total = optionEntries.length

  // Resolve correct sequence as keys for per-step reveal feedback.
  const correctKeysInOrder = answer
    .map((value) => optionEntries.find(([, text]) => text === value)?.[0])
    .filter((k): k is string => !!k)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest mb-2">
          Your order {selected.length > 0 && `(${selected.length}/${total})`}
        </p>
        {selected.length === 0 ? (
          <div className="border border-dashed border-white/[0.08] rounded-xl px-4 py-3 text-xs text-[#555]">
            Click options below to build your sequence.
          </div>
        ) : (
          <div className="space-y-2">
            {selected.map((key, i) => {
              const isCorrectPosition = isRevealed && correctKeysInOrder[i] === key
              const isWrongPosition = isRevealed && !isCorrectPosition

              const style = !isRevealed
                ? 'border-[#4f8ef7]/40 bg-[#4f8ef7]/10 text-[#e8e6f0]'
                : isCorrectPosition
                ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'
                : 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]'

              return (
                <button
                  key={`sel-${key}-${i}`}
                  onClick={() => onPick(key)}
                  disabled={isRevealed}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${style} disabled:cursor-default`}
                >
                  <span className="w-6 h-6 rounded-full border border-current/40 flex items-center justify-center text-[11px] font-mono flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm flex-1">{optionsByKey[key]}</span>
                  {isRevealed && isWrongPosition && correctKeysInOrder[i] && (
                    <span className="text-[10px] font-mono opacity-70">
                      should be: {optionsByKey[correctKeysInOrder[i]]}
                    </span>
                  )}
                  {!isRevealed && (
                    <span className="text-[10px] font-mono text-[#555]">remove</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!isRevealed && available.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest mb-2">
            Available
          </p>
          <div className="space-y-2">
            {available.map(([key, text]) => (
              <button
                key={`av-${key}`}
                onClick={() => onPick(key)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] text-[#ddd] text-left transition-all"
              >
                <span className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-[11px] font-mono flex-shrink-0">
                  +
                </span>
                <span className="text-sm flex-1">{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fill-in-the-blank input ──────────────────────────────────────────────────

interface FibInputProps {
  value: string
  onChange: (next: string) => void
  acceptedAnswers: string[]
  isRevealed: boolean
  isCorrect: boolean
}

const FibInput = ({ value, onChange, acceptedAnswers, isRevealed, isCorrect }: FibInputProps) => {
  const borderClass = !isRevealed
    ? 'border-white/[0.08] focus-within:border-[#4f8ef7]/50'
    : isCorrect
    ? 'border-[#10b981]/50 bg-[#10b981]/5'
    : 'border-[#ef4444]/50 bg-[#ef4444]/5'

  return (
    <div className="space-y-2">
      <div className={`rounded-xl border bg-white/[0.02] transition-colors ${borderClass}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isRevealed}
          placeholder="Type your answer"
          autoFocus
          className="w-full px-4 py-3 bg-transparent text-[#e8e6f0] placeholder-[#555] text-sm outline-none disabled:cursor-default"
        />
      </div>

      {isRevealed && !isCorrect && (
        <p className="text-xs text-[#888]">
          Accepted answer{acceptedAnswers.length > 1 ? 's' : ''}:{' '}
          <span className="text-[#10b981]">{acceptedAnswers.join(', ')}</span>
        </p>
      )}
    </div>
  )
}
