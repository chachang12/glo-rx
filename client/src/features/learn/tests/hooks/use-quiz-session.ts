import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isCorrect } from '@/lib/utils'
import {
  SINGLE_ANSWER_TYPES,
  type SessionQuestion,
  type SessionResults,
  type TopicBreakdown,
} from '../types/session'

type AnswerMap = Record<string, string[]>
type BoolMap = Record<string, boolean>

export type SessionPhase = 'active' | 'review' | 'complete'

interface UseQuizSessionArgs {
  questions: SessionQuestion[]
  /** Called exactly once when the session finishes (used to persist results). */
  onComplete: (results: SessionResults) => void
}

function gradeQuestion(q: SessionQuestion, selected: string[]): boolean {
  return isCorrect(
    {
      id: 0,
      type: q.type,
      stem: q.stem,
      options: q.options as Record<string, string>,
      answer: q.answer,
    },
    selected,
  )
}

/**
 * Owns the state machine for a single run through a set of questions, for both
 * grading modes:
 *   - instant: reveal + score each question as it's answered (drives streak,
 *     live accuracy, and the per-question timer).
 *   - end: collect answers silently, then reveal everything in a review pass.
 *
 * `outcomes` records the scored result the moment a question is locked in, so a
 * timed-out question counts as a miss even if the highlighted option was right.
 */
export function useQuizSession({ questions, onComplete }: UseQuizSessionArgs) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [revealed, setRevealed] = useState<BoolMap>({})
  const [outcomes, setOutcomes] = useState<BoolMap>({})
  const [phase, setPhase] = useState<SessionPhase>('active')
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [results, setResults] = useState<SessionResults | null>(null)

  // Timestamps are read only inside event handlers (never during render, which
  // react-hooks/purity forbids). Seeded on mount.
  const questionStart = useRef(0)
  const sessionStart = useRef(0)
  const timings = useRef<Record<string, number>>({})
  const completedRef = useRef(false)

  useEffect(() => {
    const t = Date.now()
    sessionStart.current = t
    questionStart.current = t
  }, [])

  const question = questions[index]
  const qId = question._id
  const selected = answers[qId] ?? []
  const isRevealed = revealed[qId] ?? false
  const isLast = index === questions.length - 1
  const total = questions.length

  const answeredCount = Object.keys(outcomes).length
  const liveCorrect = useMemo(
    () => Object.values(outcomes).filter(Boolean).length,
    [outcomes],
  )

  // ── Selection ────────────────────────────────────────────────────────────

  const select = useCallback(
    (option: string) => {
      if (revealed[qId]) return
      setAnswers((prev) => {
        const current = prev[qId] ?? []

        if (SINGLE_ANSWER_TYPES.has(question.type)) {
          return { ...prev, [qId]: [option] }
        }

        if (question.type === 'ordered') {
          // Append in click order; clicking a sequenced item drops it and
          // everything after it, keeping the sequence contiguous-from-the-top.
          const at = current.indexOf(option)
          if (at >= 0) return { ...prev, [qId]: current.slice(0, at) }
          return { ...prev, [qId]: [...current, option] }
        }

        // sata — toggle
        if (current.includes(option)) {
          return { ...prev, [qId]: current.filter((o) => o !== option) }
        }
        return { ...prev, [qId]: [...current, option] }
      })
    },
    [qId, question.type, revealed],
  )

  const setFib = useCallback(
    (value: string) => {
      if (revealed[qId]) return
      setAnswers((prev) => ({ ...prev, [qId]: [value] }))
    },
    [qId, revealed],
  )

  // ── Instant grading ──────────────────────────────────────────────────────

  const reveal = useCallback(() => {
    if (revealed[qId]) return
    timings.current[qId] = Date.now() - questionStart.current
    const correct = gradeQuestion(question, answers[qId] ?? [])
    setOutcomes((p) => ({ ...p, [qId]: correct }))
    setRevealed((p) => ({ ...p, [qId]: true }))
    const next = correct ? streak + 1 : 0
    setStreak(next)
    if (next > bestStreak) setBestStreak(next)
  }, [qId, question, answers, revealed, streak, bestStreak])

  // Single-answer instant flow: lock the tapped option and reveal in one step
  // (the mock reveals immediately on tap — no separate Submit for MCQ-style Qs).
  const answerSingle = useCallback(
    (option: string) => {
      if (revealed[qId]) return
      const sel = [option]
      setAnswers((p) => ({ ...p, [qId]: sel }))
      timings.current[qId] = Date.now() - questionStart.current
      const correct = gradeQuestion(question, sel)
      setOutcomes((p) => ({ ...p, [qId]: correct }))
      setRevealed((p) => ({ ...p, [qId]: true }))
      const next = correct ? streak + 1 : 0
      setStreak(next)
      if (next > bestStreak) setBestStreak(next)
    },
    [qId, question, revealed, streak, bestStreak],
  )

  const markTimeout = useCallback(() => {
    if (revealed[qId]) return
    timings.current[qId] = Date.now() - questionStart.current
    setOutcomes((p) => ({ ...p, [qId]: false }))
    setRevealed((p) => ({ ...p, [qId]: true }))
    setStreak(0)
  }, [qId, revealed])

  // ── Navigation ───────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    // record timing for un-revealed (end mode) answers before moving on
    if (!(qId in timings.current)) {
      timings.current[qId] = Date.now() - questionStart.current
    }
    if (!isLast) {
      setIndex((i) => i + 1)
      questionStart.current = Date.now()
    }
  }, [qId, isLast])

  // Called only from event handlers, so Date.now() here is safe.
  const buildResults = useCallback(
    (outcomesOverride?: BoolMap): SessionResults => {
      const oc = outcomesOverride ?? outcomes
      const resultAnswers = questions.map((q) => {
        const sel = answers[q._id] ?? []
        const correct = q._id in oc ? oc[q._id] : gradeQuestion(q, sel)
        return {
          questionId: q._id,
          selected: sel,
          correct,
          timeMs: timings.current[q._id] ?? 0,
        }
      })
      return {
        totalQuestions: questions.length,
        correctCount: resultAnswers.filter((a) => a.correct).length,
        answers: resultAnswers,
        durationMs: Date.now() - sessionStart.current,
      }
    },
    [questions, answers, outcomes],
  )

  const finish = useCallback(() => {
    if (!(qId in timings.current)) {
      timings.current[qId] = Date.now() - questionStart.current
    }
    const r = buildResults()
    setResults(r)
    if (!completedRef.current) {
      completedRef.current = true
      onComplete(r)
    }
    setPhase('complete')
  }, [qId, buildResults, onComplete])

  const revealAllForReview = useCallback(() => {
    if (!(qId in timings.current)) {
      timings.current[qId] = Date.now() - questionStart.current
    }
    const allRevealed: BoolMap = {}
    const allOutcomes: BoolMap = {}
    for (const q of questions) {
      allRevealed[q._id] = true
      allOutcomes[q._id] = gradeQuestion(q, answers[q._id] ?? [])
    }
    setRevealed(allRevealed)
    setOutcomes(allOutcomes)
    setResults(buildResults(allOutcomes))
    setPhase('review')
  }, [qId, questions, answers, buildResults])

  // ── Derived for the complete screen ──────────────────────────────────────

  const topicBreakdown = useMemo<TopicBreakdown>(() => {
    const weak = new Set<string>()
    const right = new Set<string>()
    for (const q of questions) {
      const topic = q.topics?.[0]
      if (!topic) continue
      const correct = q._id in outcomes ? outcomes[q._id] : gradeQuestion(q, answers[q._id] ?? [])
      if (correct) right.add(topic)
      else weak.add(topic)
    }
    return {
      weak: [...weak],
      strong: [...right].filter((t) => !weak.has(t)),
    }
  }, [questions, outcomes, answers])

  return {
    // state
    index,
    total,
    question,
    qId,
    selected,
    isRevealed,
    isLast,
    phase,
    streak,
    bestStreak,
    answeredCount,
    liveCorrect,
    outcomes,
    answers,
    results,
    topicBreakdown,
    // actions
    select,
    setFib,
    answerSingle,
    reveal,
    markTimeout,
    goNext,
    finish,
    revealAllForReview,
  }
}

export type QuizSession = ReturnType<typeof useQuizSession>
