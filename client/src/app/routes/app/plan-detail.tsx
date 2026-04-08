import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'

interface Exam {
  code: string
  label: string
  category: string
  description: string
}

interface Plan {
  _id: string
  examCode: string
  examDate: string | null
  dailyGoal: number | null
  status: string
}

interface TestSummary {
  _id: string
  title: string
  tags: string[]
  questionCount: number
  timesPlayed: number
  createdAt: string
}

export const PlanDetail = () => {
  const { examCode } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [tests, setTests] = useState<TestSummary[]>([])
  const [notFound, setNotFound] = useState(false)
  const [notEnrolled, setNotEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    apiFetch('/api/exams/all')
      .then((res) => res.json())
      .then((exams: Exam[]) => {
        const match = exams.find((e) => e.code === examCode)
        if (match) setExam(match)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))

    apiFetch(`/api/plans/${examCode}`)
      .then((res) => {
        if (res.status === 404) { setNotEnrolled(true); return null }
        return res.json()
      })
      .then((data) => { if (data) setPlan(data) })
      .catch(() => {})

    // Fetch community tests for this exam
    apiFetch(`/api/tests?examCode=${examCode}`)
      .then((res) => res.json())
      .then((data) => setTests(data.tests ?? []))
      .catch(() => {})
  }, [examCode])

  const handleEnroll = async () => {
    setEnrolling(true)
    try {
      const res = await apiFetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examCode }),
      })
      if (res.ok) {
        const newPlan = await res.json()
        setPlan(newPlan)
        setNotEnrolled(false)
      }
    } finally {
      setEnrolling(false)
    }
  }

  if (notFound) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-[#e8e6f0]">Exam not found</h1>
          <p className="text-sm text-[#888]">No exam matching "{examCode}" exists.</p>
          <Link to={paths.app.plans.getHref()} className="text-sm text-[#4f8ef7] hover:underline">
            &larr; Back to plans
          </Link>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notEnrolled) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.plans.getHref()} className="text-[#4f8ef7] hover:underline">Plans</Link>
            <span>/</span>
            <span className="text-[#888]">{exam.label}</span>
          </div>
          <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">{exam.label}</h1>
            <p className="text-sm text-[#888]">{exam.description}</p>
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="px-5 py-2.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50"
            >
              {enrolling ? 'Adding...' : 'Add to my plans'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.plans.getHref()} className="text-[#4f8ef7] hover:underline">Plans</Link>
          <span>/</span>
          <span className="text-[#888]">{exam.label}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">{exam.label}</h1>
            <p className="text-sm text-[#888]">{exam.description}</p>
            {plan?.examDate && (
              <p className="text-xs text-[#888]">
                Exam date: <span className="text-[#ddd] font-mono">{new Date(plan.examDate).toLocaleDateString()}</span>
              </p>
            )}
          </div>
          <Link
            to={paths.app.planSettings.getHref(exam.code)}
            className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm text-[#888] hover:text-[#4f8ef7] hover:border-[#4f8ef7]/30 transition-all"
            title="Plan settings"
          >
            <GearIcon />
          </Link>
        </div>

        {/* Community Tests */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#bbb]">Community Tests</h2>
          {tests.length > 0 ? (
            <div className="space-y-3">
              {tests.map((test) => (
                <Link
                  key={test._id}
                  to={`${paths.app.test.getHref()}?testId=${test._id}`}
                  className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 hover:border-[#4f8ef7]/30 transition-all"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white group-hover:text-[#4f8ef7] transition-colors truncate">
                      {test.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#888]">
                      <span className="font-mono">{test.questionCount} Qs</span>
                      <span>{test.timesPlayed} plays</span>
                    </div>
                    {test.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {test.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[10px] font-mono text-[#888]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[#555] ml-4 shrink-0">
                    Start &rarr;
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 text-center">
              <p className="text-sm text-[#888]">No community tests yet for {exam.label}</p>
              <p className="text-xs text-[#555] mt-1">Tests created by the community will appear here</p>
            </div>
          )}
        </div>

        {/* Tools */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#bbb]">Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to={paths.app.planFlashcards.getHref(exam.code)}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 hover:border-[#4f8ef7]/30 transition-all"
            >
              <p className="text-sm font-semibold text-white group-hover:text-[#4f8ef7] transition-colors">
                Flashcard Generator
              </p>
              <p className="text-xs text-[#888] mt-1">
                Paste notes or upload a PDF to generate AI-powered flashcards
              </p>
            </Link>
          </div>
        </div>

        {/* Resources */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#bbb]">Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResourceCard
              title="Topic Review"
              description="Review key topics and concepts by category"
            />
            <ResourceCard
              title="Question Bank"
              description="Browse individual questions by difficulty and topic"
            />
            <ResourceCard
              title="Study Schedule"
              description="AI-generated study plan based on your exam date"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const ResourceCard = ({
  title,
  description,
}: {
  title: string
  description: string
}) => (
  <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 opacity-50">
    <p className="text-sm font-semibold text-[#ddd]">{title}</p>
    <p className="text-xs text-[#888] mt-1">{description}</p>
    <p className="text-[10px] font-mono text-[#555] mt-2">Coming soon</p>
  </div>
)

const GearIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
