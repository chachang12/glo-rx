import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  PracticeSession,
  recordExposure,
  recordAnswer,
  getTest,
  getTopicQuestions,
  type SessionResults,
  type SessionQuestion,
  type GradingMode,
} from '@/features/learn/tests'
import { getOfficialTest, getExamQuestions } from '@/features/learn/exams'

type SessionMode = 'setup' | 'active'

export const Test = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const testId = searchParams.get('testId')
  const isOfficial = searchParams.get('official') === 'true'
  const examCodeParam = searchParams.get('examCode')
  const mode = searchParams.get('mode') // 'bank'
  const topicsParam = searchParams.get('topics')
  const topicId = searchParams.get('topicId')
  const customPlanId = searchParams.get('customPlanId') // present for custom-plan topic practice

  // `pool` is everything we loaded; `activeQuestions` is the shuffled slice for
  // the current run (kept separate so "Start another session" can re-draw).
  const [pool, setPool] = useState<SessionQuestion[]>([])
  const [activeQuestions, setActiveQuestions] = useState<SessionQuestion[]>([])
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionExamCode, setSessionExamCode] = useState<string | undefined>(undefined)
  const [gradingMode, setGradingMode] = useState<GradingMode>('instant')
  const [questionCount, setQuestionCount] = useState(20)
  const [sessionMode, setSessionMode] = useState<SessionMode>('setup')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load questions based on source
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        if (testId) {
          // Official test or community test
          const data = isOfficial ? await getOfficialTest(testId) : await getTest(testId)
          setPool(
            (data.questions ?? []).map((q) => ({
              _id: q._id,
              type: q.type as SessionQuestion['type'],
              stem: q.stem,
              options: q.options ?? {},
              answer: q.answer,
              explanation: q.explanation,
              topics: q.topics,
              difficulty: q.difficulty ?? undefined,
            })),
          )
          setSessionTitle(data.title ?? 'Practice Test')
          setSessionExamCode(data.examCode ?? undefined)
          setGradingMode('end') // full tests default to end grading
        } else if (topicId && (customPlanId || examCodeParam)) {
          // Topic-anchored practice — questions generated for a specific topic
          const data = await getTopicQuestions({
            topicId,
            examCode: examCodeParam ?? undefined,
            customPlanId: customPlanId ?? undefined,
          })
          setPool(
            data.questions.map((q) => ({
              _id: q.id,
              type: q.type as SessionQuestion['type'],
              stem: q.stem,
              // FIB stores options as {} server-side; Mongoose Mixed can drop the
              // empty object before it reaches the client, so coalesce.
              options: q.options ?? (q.type === 'ordered' ? [] : {}),
              answer: q.answer,
              explanation: q.explanation,
              difficulty: q.difficulty ?? undefined,
              pendingReview: q.pendingReview,
            })),
          )
          setSessionTitle(data.topicLabel ?? 'Topic Practice')
          setSessionExamCode(examCodeParam ?? undefined)
          setGradingMode('instant')
        } else if (examCodeParam) {
          // Question bank or topic-based practice
          const data = await getExamQuestions(examCodeParam, { limit: 100 })
          setPool(
            data.map((q) => ({
              _id: q._id,
              type: q.type as SessionQuestion['type'],
              stem: q.stem,
              options: q.options,
              answer: q.answer,
              explanation: q.explanation,
              topics: q.topics,
              difficulty: q.difficulty ?? undefined,
            })),
          )
          setSessionTitle(mode === 'bank' ? 'Question Bank' : 'Practice Session')
          setSessionExamCode(examCodeParam)
          setGradingMode('instant') // bank defaults to instant
        }
      } catch {
        setError('Failed to load questions')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [testId, isOfficial, examCodeParam, mode, topicsParam, topicId, customPlanId])

  const handleStartSession = useCallback(() => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const sessionQuestions = testId ? shuffled : shuffled.slice(0, questionCount)
    setActiveQuestions(sessionQuestions)
    setSessionMode('active')

    const ids = sessionQuestions.map((q) => q._id).filter(Boolean)
    if (ids.length > 0) {
      recordExposure(ids).catch(() => {})
    }
  }, [pool, questionCount, testId])

  // Persist per-question outcomes for exposure tracking. Fired once by the
  // session when it completes.
  const handleComplete = useCallback((sessionResults: SessionResults) => {
    for (const answer of sessionResults.answers) {
      if (answer.questionId) {
        recordAnswer({ questionId: answer.questionId, correct: answer.correct }).catch(() => {})
      }
    }
  }, [])

  const handleRestart = useCallback(() => setSessionMode('setup'), [])
  const handleExit = useCallback(() => navigate(-1), [navigate])

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-2xl space-y-4 py-16 text-center">
          <p className="text-sm text-[#a7adbd]">{error}</p>
          <button onClick={() => navigate(-1)} className="text-xs text-[#6aa8ff] hover:underline">
            Go back
          </button>
        </div>
      </div>
    )
  }

  // ── Active session ────────────────────────────────────────────────────────

  if (sessionMode === 'active') {
    return (
      <PracticeSession
        questions={activeQuestions}
        title={sessionTitle}
        examCode={sessionExamCode}
        gradingMode={gradingMode}
        onComplete={handleComplete}
        onRestart={handleRestart}
        onExit={handleExit}
      />
    )
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  const maxQuestions = pool.length

  if (maxQuestions === 0) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-2xl space-y-4 py-16 text-center">
          <p className="text-sm text-[#a7adbd]">No questions available</p>
          <button onClick={() => navigate(-1)} className="text-xs text-[#6aa8ff] hover:underline">
            Go back
          </button>
        </div>
      </div>
    )
  }

  const gradingToggle = (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[#cfd4df]">Grading Mode</p>
      <div className="flex gap-2">
        {(['instant', 'end'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setGradingMode(m)}
            className={`flex-1 rounded-[10px] py-2.5 text-xs font-semibold transition-all ${
              gradingMode === m
                ? 'border border-[#6aa8ff]/30 bg-[#6aa8ff]/10 text-[#6aa8ff]'
                : 'border border-white/[0.08] bg-white/[0.03] text-[#5b6173] hover:text-[#a7adbd]'
            }`}
          >
            {m === 'instant' ? 'Instant Feedback' : 'Grade at End'}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[#5b6173]">
        {gradingMode === 'instant'
          ? 'See if you got each question right immediately after answering'
          : 'Answer all questions first, then review your results'}
      </p>
    </div>
  )

  return (
    <div className="p-8">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#f3f5f9]">{sessionTitle}</h1>
          <p className="text-sm text-[#a7adbd]">
            {maxQuestions} question{maxQuestions === 1 ? '' : 's'}
            {testId ? '' : ' available'}
          </p>
        </div>

        <div className="space-y-5 rounded-[12px] border border-white/[0.07] bg-white/[0.03] p-6">
          {!testId && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#cfd4df]">Number of Questions</p>
              <div className="flex flex-wrap items-center gap-3">
                {[10, 20, 30, 50].filter((n) => n <= maxQuestions).map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`rounded-[10px] px-4 py-2 text-xs font-semibold transition-all ${
                      questionCount === n
                        ? 'border border-[#6aa8ff]/30 bg-[#6aa8ff]/10 text-[#6aa8ff]'
                        : 'border border-white/[0.08] bg-white/[0.03] text-[#5b6173] hover:text-[#a7adbd]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {maxQuestions > 50 && (
                  <button
                    onClick={() => setQuestionCount(maxQuestions)}
                    className={`rounded-[10px] px-4 py-2 text-xs font-semibold transition-all ${
                      questionCount === maxQuestions
                        ? 'border border-[#6aa8ff]/30 bg-[#6aa8ff]/10 text-[#6aa8ff]'
                        : 'border border-white/[0.08] bg-white/[0.03] text-[#5b6173] hover:text-[#a7adbd]'
                    }`}
                  >
                    All ({maxQuestions})
                  </button>
                )}
              </div>
            </div>
          )}

          {gradingToggle}
        </div>

        <button
          onClick={handleStartSession}
          className="w-full rounded-[12px] bg-[#6aa8ff] py-3 text-sm font-semibold text-[#0f0f1a] transition-all hover:bg-[#6aa8ff]/90"
        >
          {testId ? 'Start Test' : `Start with ${Math.min(questionCount, maxQuestions)} Questions`}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-2 text-xs text-[#5b6173] transition-colors hover:text-[#a7adbd]"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
