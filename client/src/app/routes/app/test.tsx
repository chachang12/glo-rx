import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import { PracticeSession, type SessionResults } from '@/features/practice-test/components/PracticeSession'

interface SessionQuestion {
  _id: string
  type: 'mcq' | 'sata' | 'ordered'
  stem: string
  options: Record<string, string> | string[]
  answer: string[]
  explanation?: string
  topics?: string[]
  difficulty?: string
}

type SessionMode = 'setup' | 'active' | 'results'

export const Test = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const testId = searchParams.get('testId')
  const isOfficial = searchParams.get('official') === 'true'
  const examCode = searchParams.get('examCode')
  const mode = searchParams.get('mode') // 'bank'
  const topicsParam = searchParams.get('topics')

  const [questions, setQuestions] = useState<SessionQuestion[]>([])
  const [sessionTitle, setSessionTitle] = useState('')
  const [gradingMode, setGradingMode] = useState<'instant' | 'end'>('instant')
  const [questionCount, setQuestionCount] = useState(20)
  const [sessionMode, setSessionMode] = useState<SessionMode>('setup')
  const [results, setResults] = useState<SessionResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load questions based on source
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        if (testId) {
          // Official test or community test
          const endpoint = isOfficial
            ? `/api/exams/official-tests/${testId}`
            : `/api/tests/${testId}`
          const res = await apiFetch(endpoint)
          if (!res.ok) { setError('Test not found'); return }
          const data = await res.json()
          setQuestions(data.questions ?? [])
          setSessionTitle(data.title ?? 'Practice Test')
          setGradingMode('end') // full tests default to end grading
        } else if (examCode) {
          // Question bank or topic-based practice
          let url = `/api/exams/${examCode}/questions?limit=100`
          if (topicsParam) {
            // Fetch all then filter by topics
          }
          const res = await apiFetch(url)
          if (!res.ok) { setError('Failed to load questions'); return }
          const data = await res.json()
          setQuestions(data)
          setSessionTitle(mode === 'bank' ? 'Question Bank' : 'Practice Session')
          setGradingMode('instant') // bank defaults to instant
        }
      } catch {
        setError('Failed to load questions')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [testId, isOfficial, examCode, mode, topicsParam])

  const handleStartSession = useCallback(() => {
    // Slice questions to desired count and shuffle
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    const sessionQuestions = shuffled.slice(0, questionCount)
    setQuestions(sessionQuestions)
    setSessionMode('active')

    // Record exposure
    const ids = sessionQuestions.map((q) => q._id).filter(Boolean)
    if (ids.length > 0) {
      apiFetch('/api/exams/exposure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: ids }),
      }).catch(() => {})
    }
  }, [questions, questionCount])

  const handleComplete = useCallback((sessionResults: SessionResults) => {
    setResults(sessionResults)
    setSessionMode('results')

    // Record answers for exposure tracking
    for (const answer of sessionResults.answers) {
      if (answer.questionId) {
        apiFetch('/api/exams/exposure/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: answer.questionId, correct: answer.correct }),
        }).catch(() => {})
      }
    }
  }, [])

  const handleExit = useCallback(() => {
    navigate(-1)
  }, [navigate])

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
          <p className="text-sm text-[#888]">{error}</p>
          <button onClick={() => navigate(-1)} className="text-xs text-[#4f8ef7] hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  // ── Setup Screen ──────────────────────────────────────────────────────────

  if (sessionMode === 'setup') {
    const maxQuestions = questions.length

    if (maxQuestions === 0) {
      return (
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
            <p className="text-sm text-[#888]">No questions available</p>
            <button onClick={() => navigate(-1)} className="text-xs text-[#4f8ef7] hover:underline">Go back</button>
          </div>
        </div>
      )
    }

    // For full tests, skip setup and go directly
    if (testId) {
      return (
        <div className="p-8">
          <div className="max-w-lg mx-auto space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">{sessionTitle}</h1>
              <p className="text-sm text-[#888]">{maxQuestions} questions</p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 space-y-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#bbb]">Grading Mode</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGradingMode('instant')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      gradingMode === 'instant'
                        ? 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]'
                        : 'border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#888]'
                    }`}
                  >
                    Instant Feedback
                  </button>
                  <button
                    onClick={() => setGradingMode('end')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      gradingMode === 'end'
                        ? 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]'
                        : 'border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#888]'
                    }`}
                  >
                    Grade at End
                  </button>
                </div>
                <p className="text-[10px] text-[#555]">
                  {gradingMode === 'instant'
                    ? 'See if you got each question right immediately after submitting'
                    : 'Answer all questions first, then review your results'}
                </p>
              </div>
            </div>

            <button
              onClick={handleStartSession}
              className="w-full py-3 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
            >
              Start Test
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-2 text-xs text-[#555] hover:text-[#888] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    // Question bank / practice session setup
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">{sessionTitle}</h1>
            <p className="text-sm text-[#888]">{maxQuestions} questions available</p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 space-y-5">
            {/* Question count */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#bbb]">Number of Questions</p>
              <div className="flex items-center gap-3">
                {[10, 20, 30, 50].filter((n) => n <= maxQuestions).map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      questionCount === n
                        ? 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]'
                        : 'border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#888]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {maxQuestions > 50 && (
                  <button
                    onClick={() => setQuestionCount(maxQuestions)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      questionCount === maxQuestions
                        ? 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]'
                        : 'border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#888]'
                    }`}
                  >
                    All ({maxQuestions})
                  </button>
                )}
              </div>
            </div>

            {/* Grading mode */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#bbb]">Grading Mode</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setGradingMode('instant')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    gradingMode === 'instant'
                      ? 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]'
                      : 'border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#888]'
                  }`}
                >
                  Instant Feedback
                </button>
                <button
                  onClick={() => setGradingMode('end')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    gradingMode === 'end'
                      ? 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]'
                      : 'border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#888]'
                  }`}
                >
                  Grade at End
                </button>
              </div>
              <p className="text-[10px] text-[#555]">
                {gradingMode === 'instant'
                  ? 'See if you got each question right immediately after submitting'
                  : 'Answer all questions first, then review your results'}
              </p>
            </div>
          </div>

          <button
            onClick={handleStartSession}
            className="w-full py-3 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
          >
            Start with {Math.min(questionCount, maxQuestions)} Questions
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-2 text-xs text-[#555] hover:text-[#888] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Active Session ──────────────────────────────────────────────────────

  if (sessionMode === 'active') {
    return (
      <PracticeSession
        questions={questions}
        title={sessionTitle}
        gradingMode={gradingMode}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    )
  }

  // ── Results ─────────────────────────────────────────────────────────────

  if (sessionMode === 'results' && results) {
    const score = Math.round((results.correctCount / results.totalQuestions) * 100)
    const avgTime = results.answers.length > 0
      ? Math.round(results.answers.reduce((sum, a) => sum + a.timeMs, 0) / results.answers.length / 1000)
      : 0

    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto space-y-8">
          {/* Score */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center space-y-4">
            <p className="text-6xl font-bold tabular-nums" style={{
              color: score >= 80 ? '#10b981' : score >= 60 ? '#eab308' : '#ef4444'
            }}>
              {score}%
            </p>
            <p className="text-sm text-[#888]">
              {results.correctCount} of {results.totalQuestions} correct
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-[#555]">
              <span>{Math.round(results.durationMs / 1000)}s total</span>
              <span>{avgTime}s avg per question</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setSessionMode('setup')
                setResults(null)
              }}
              className="w-full py-3 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
            >
              Practice Again
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-[#888] hover:text-[#ddd] transition-all"
            >
              Back to Plan
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <PageLoader />
}
