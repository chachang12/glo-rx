import { useCallback, useEffect, useMemo, useState } from 'react'
import { SINGLE_ANSWER_TYPES, type GradingMode, type SessionQuestion, type SessionResults } from '../types/session'
import { useQuizSession } from '../hooks/use-quiz-session'
import { useQuestionTimer } from '../hooks/use-question-timer'
import { useTutorExplanation, type TutorExplanation } from '../api/get-tutor'
import { SessionHud } from './SessionHud'
import { QuestionTimer } from './QuestionTimer'
import { AnswerSurface } from './AnswerSurface'
import { FeedbackPanel } from './FeedbackPanel'
import { AiTutorPanel } from './AiTutorPanel'
import { SessionComplete } from './SessionComplete'
import { SessionReview } from './SessionReview'
import './quiz-session.css'

export type { SessionResults } from '../types/session'

const QUESTION_SECONDS = 90
const CORRECT_MSGS = ['Correct.', 'Exactly right.', 'Well done.', 'Spot on.', "That's it."]
const INCORRECT_MSGS = ['Not quite.', 'Close, but not right.', 'Almost — keep going.']

interface PracticeSessionProps {
  questions: SessionQuestion[]
  title: string
  gradingMode: GradingMode
  /** Exam this session belongs to — attributes AI-tutor usage to the right plan. */
  examCode?: string
  onComplete: (results: SessionResults) => void
  onRestart: () => void
  onExit: () => void
}

function toEntries(options: SessionQuestion['options']): [string, string][] {
  if (!options) return []
  if (Array.isArray(options)) return options.map((v, i) => [String(i), v])
  return Object.entries(options)
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const PracticeSession = ({
  questions,
  title,
  gradingMode,
  examCode,
  onComplete,
  onRestart,
  onExit,
}: PracticeSessionProps) => {
  const session = useQuizSession({ questions, onComplete })
  const {
    question,
    qId,
    selected,
    isRevealed,
    isLast,
    index,
    total,
    phase,
    streak,
    bestStreak,
    answeredCount,
    liveCorrect,
    outcomes,
    answers,
    results,
    topicBreakdown,
  } = session

  const isMulti = !SINGLE_ANSWER_TYPES.has(question.type)
  const topic = question.topics?.[0] ?? title
  const outcome = isRevealed ? (outcomes[qId] ? 'correct' : 'incorrect') : null

  // ── Timed-out tracking (for the ⏱ feedback icon) ─────────────────────────
  const [timedOut, setTimedOut] = useState<Record<string, boolean>>({})
  const handleTimeout = useCallback(() => {
    setTimedOut((p) => ({ ...p, [qId]: true }))
    session.markTimeout()
  }, [qId, session])

  const timerActive = gradingMode === 'instant' && phase === 'active' && !isRevealed
  const { timeLeft, totalSeconds } = useQuestionTimer({
    seconds: QUESTION_SECONDS,
    active: timerActive,
    resetKey: qId,
    onExpire: handleTimeout,
  })

  // ── Streak toast ─────────────────────────────────────────────────────────
  const [toast, setToast] = useState<number | null>(null)
  useEffect(() => {
    if (streak > 0 && streak % 3 === 0) {
      setToast(streak)
      const id = setTimeout(() => setToast(null), 2200)
      return () => clearTimeout(id)
    }
  }, [streak])

  // ── Answer readable strings (feedback + tutor) ───────────────────────────
  const { correctAnswerText, userAnswerText, optionsText } = useMemo(() => {
    const entries = toEntries(question.options)
    const byKey = Object.fromEntries(entries) as Record<string, string>
    const toText = (keys: string[], joiner: string) =>
      keys.map((k) => byKey[k] ?? k).join(joiner)

    if (question.type === 'fib') {
      return {
        correctAnswerText: question.answer.join(', '),
        userAnswerText: selected[0] ?? '',
        optionsText: '',
      }
    }
    if (question.type === 'ordered') {
      return {
        correctAnswerText: question.answer.join(' → '),
        userAnswerText: toText(selected, ' → '),
        optionsText: entries.map(([, v], i) => `${i + 1}. ${v}`).join('\n'),
      }
    }
    return {
      correctAnswerText: toText(question.answer, ', '),
      userAnswerText: toText(selected, ', '),
      optionsText: entries.map(([k, v]) => `${k.toUpperCase()}. ${v}`).join('\n'),
    }
  }, [question, selected])

  // ── AI tutor ─────────────────────────────────────────────────────────────
  const tutor = useTutorExplanation()
  const [tutorOpen, setTutorOpen] = useState(false)
  const [tutorCache, setTutorCache] = useState<Record<string, TutorExplanation>>({})

  const requestTutor = useCallback(() => {
    tutor.mutate(
      {
        examCode,
        stem: question.stem,
        optionsText,
        correctAnswer: correctAnswerText,
        userAnswer: userAnswerText,
        explanation: question.explanation,
      },
      { onSuccess: (data) => setTutorCache((p) => ({ ...p, [qId]: data })) },
    )
  }, [tutor, examCode, question, optionsText, correctAnswerText, userAnswerText, qId])

  const openTutor = useCallback(() => {
    setTutorOpen(true)
    if (!tutorCache[qId]) requestTutor()
  }, [tutorCache, qId, requestTutor])

  // ── Title for the feedback panel ─────────────────────────────────────────
  const feedbackTitle = useMemo(() => {
    if (!isRevealed) return ''
    if (timedOut[qId]) return "Time's up."
    return outcomes[qId] ? rand(CORRECT_MSGS) : rand(INCORRECT_MSGS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qId, isRevealed, outcomes[qId], timedOut[qId]])

  // ── Selection ────────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (key: string) => {
      if (isRevealed) return
      if (gradingMode === 'instant' && !isMulti) {
        session.answerSingle(key)
      } else {
        session.select(key)
      }
    },
    [isRevealed, gradingMode, isMulti, session],
  )

  // ── Primary button ───────────────────────────────────────────────────────
  const advance = useCallback(() => {
    if (gradingMode === 'instant') {
      if (isLast) session.finish()
      else session.goNext()
      return
    }
    // end mode
    if (isLast) session.revealAllForReview()
    else session.goNext()
  }, [gradingMode, isLast, session])

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return
    const onKey = (e: KeyboardEvent) => {
      if (tutorOpen) return
      const entries = toEntries(question.options)
      const keyMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 }
      const k = e.key.toLowerCase()

      if (k in keyMap && !isRevealed && question.type !== 'fib' && question.type !== 'ordered') {
        const di = keyMap[k]
        if (di < entries.length) {
          e.preventDefault()
          handleSelect(entries[di][0])
        }
        return
      }
      if ((e.key === ' ' || e.key === 'Enter')) {
        // Continue / Next when an answer is locked (instant), or advance in end mode.
        if (isRevealed || (gradingMode === 'end' && selected.length > 0)) {
          e.preventDefault()
          advance()
        } else if (gradingMode === 'instant' && isMulti && selected.length > 0) {
          e.preventDefault()
          session.reveal()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, tutorOpen, question, isRevealed, gradingMode, isMulti, selected, handleSelect, advance, session])

  // ── Render: completion / review / active ─────────────────────────────────

  if (phase === 'complete' && results) {
    return (
      <div className="quiz-session">
        <div className="quiz-backdrop" data-state="correct" />
        <div className="quiz-grid" />
        <div className="relative z-[1]">
          <SessionComplete
            results={results}
            bestStreak={bestStreak}
            topics={topicBreakdown}
            onRestart={onRestart}
            onExit={onExit}
          />
        </div>
      </div>
    )
  }

  if (phase === 'review' && results) {
    return (
      <div className="quiz-session">
        <div className="quiz-backdrop" />
        <div className="quiz-grid" />
        <div className="relative z-[1] px-4 pt-6">
          <SessionReview
            questions={questions}
            answers={answers}
            outcomes={outcomes}
            correctCount={results.correctCount}
            onDone={session.finish}
          />
        </div>
      </div>
    )
  }

  const liveAccuracy =
    gradingMode === 'instant' && answeredCount > 0
      ? Math.round((liveCorrect / answeredCount) * 100)
      : null

  const tutorData = tutorCache[qId] ?? null

  return (
    <div className="quiz-session">
      <div className="quiz-backdrop" data-state={outcome ?? undefined} />
      <div className="quiz-grid" />

      {toast !== null && (
        <div className="pointer-events-none fixed left-1/2 top-[72px] z-[201] -translate-x-1/2">
          <div className="quiz-toast flex items-center gap-2 whitespace-nowrap rounded-full border border-[#6e9cc7]/25 bg-[#6e9cc7]/10 px-4 py-1.5 text-[12.5px] font-medium text-[#6e9cc7]">
            <span>✦</span> {toast} in a row
          </div>
        </div>
      )}

      <div className="relative z-[1] mx-auto flex min-h-full max-w-[540px] flex-col px-5 pb-10">
        <SessionHud
          index={index}
          total={total}
          topic={topic}
          streak={streak}
          accuracy={liveAccuracy}
          onExit={onExit}
        />

        {gradingMode === 'instant' && <QuestionTimer timeLeft={timeLeft} totalSeconds={totalSeconds} />}

        <div className="flex flex-col gap-3">
          {/* Topic eyebrow */}
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/[0.07] bg-white/[0.04] py-[3px] pl-1.5 pr-2.5 font-mono text-[10.5px] tracking-wide text-[#5b6173]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#6e9cc7]" style={{ boxShadow: '0 0 6px rgba(110,156,199,0.7)' }} />
            <span className="uppercase">{topic}</span>
          </div>

          {/* Question card */}
          <div className="relative overflow-hidden rounded-[12px] border border-white/[0.13] bg-white/[0.03] p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#5b6173]">
                {question.type === 'fib' ? 'FILL-IN' : question.type}
              </span>
              {question.difficulty && (
                <span
                  className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background:
                      question.difficulty === 'hard'
                        ? 'rgba(255,72,88,0.1)'
                        : question.difficulty === 'medium'
                          ? 'rgba(234,179,8,0.1)'
                          : 'rgba(110,156,199,0.12)',
                    color:
                      question.difficulty === 'hard'
                        ? '#ff4858'
                        : question.difficulty === 'medium'
                          ? '#eab308'
                          : '#6e9cc7',
                  }}
                >
                  {question.difficulty}
                </span>
              )}
              {question.type === 'sata' && <span className="text-[10px] text-[#a7adbd]">Select all that apply</span>}
              {question.type === 'priority' && <span className="text-[10px] text-[#a7adbd]">Pick the highest priority</span>}
              {question.type === 'ordered' && <span className="text-[10px] text-[#a7adbd]">Tap in the correct order</span>}
              {question.pendingReview && (
                <span className="rounded-full bg-[#ffb45a]/10 px-2 py-0.5 text-[10px] font-medium text-[#ffb45a]">
                  Pending review
                </span>
              )}
            </div>

            <p className="mt-5 whitespace-pre-line text-[17px] font-medium leading-relaxed tracking-[-0.01em] text-[#f3f5f9]">
              {question.stem}
            </p>
          </div>

          {/* Answers */}
          <AnswerSurface
            key={qId}
            question={question}
            selected={selected}
            isRevealed={isRevealed}
            onSelect={handleSelect}
            onFib={session.setFib}
          />

          {/* Feedback (instant, after reveal) */}
          {isRevealed && (
            <FeedbackPanel
              isCorrect={!!outcomes[qId]}
              timedOut={!!timedOut[qId]}
              title={feedbackTitle}
              explanation={question.explanation}
              correctAnswerText={correctAnswerText}
              showTutorButton={!outcomes[qId]}
              onOpenTutor={openTutor}
            />
          )}

          {/* Primary action */}
          <div className="mt-1">
            {gradingMode === 'instant' && isMulti && !isRevealed && (
              <button
                onClick={session.reveal}
                disabled={selected.length === 0}
                className="w-full rounded-[12px] bg-[#6e9cc7] py-3.5 text-[15px] font-medium text-[#05060a] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit
              </button>
            )}

            {gradingMode === 'instant' && isRevealed && (
              <button
                onClick={advance}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3.5 text-[15px] font-medium transition-all hover:-translate-y-0.5"
                style={
                  outcomes[qId]
                    ? { background: '#6e9cc7', color: '#05060a', boxShadow: '0 6px 28px rgba(110,156,199,0.22)' }
                    : { background: 'rgba(255,72,88,0.1)', color: '#ff4858', border: '1.5px solid rgba(255,72,88,0.28)' }
                }
              >
                {isLast ? 'Finish' : 'Continue'} <span>→</span>
              </button>
            )}

            {gradingMode === 'end' && (
              <button
                onClick={advance}
                disabled={selected.length === 0}
                className="w-full rounded-[12px] bg-[#6e9cc7] py-3.5 text-[15px] font-medium text-[#05060a] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLast ? 'Submit all' : 'Next'}
              </button>
            )}
          </div>

          {/* Keyboard hint — pointer-fine devices only */}
          {gradingMode === 'instant' && !isMulti && !isRevealed && (
            <div className="hidden text-center font-mono text-[10.5px] tracking-wide text-[#5b6173] [@media(hover:hover)]:block">
              Press <Kbd>A</Kbd>
              <Kbd>B</Kbd>
              <Kbd>C</Kbd>
              <Kbd>D</Kbd> to answer
            </div>
          )}
        </div>
      </div>

      <AiTutorPanel
        open={tutorOpen}
        loading={tutor.isPending && !tutorData}
        error={tutor.isError && !tutorData}
        data={tutorData}
        onClose={() => setTutorOpen(false)}
        onRetry={requestTutor}
      />
    </div>
  )
}

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <span className="mx-0.5 inline-block rounded border border-white/[0.13] bg-white/[0.07] px-1.5 py-px text-[9.5px] text-[#5b6173]">
    {children}
  </span>
)
