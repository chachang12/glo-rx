import { useEffect, useState, useCallback } from 'react'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { useNavigate } from 'react-router'

interface Exam {
  code: string
  label: string
  category: string
  description: string
  active: boolean
}

interface Plan {
  examCode: string
  status: string
}

const CATEGORY_COLORS: Record<string, string> = {
  nursing: '#4f8ef7',
  medical: '#10b981',
  law: '#8b5cf6',
  accounting: '#e07b3f',
}

const CATEGORY_LABELS: Record<string, string> = {
  nursing: 'Nursing',
  medical: 'Medical',
  law: 'Law',
  accounting: 'Accounting',
}

export const Marketplace = () => {
  const [exams, setExams] = useState<Exam[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/api/exams/all')
      .then((res) => res.json())
      .then(setExams)
      .catch(() => {})

    apiFetch('/api/plans')
      .then((res) => res.json())
      .then(setPlans)
      .catch(() => {})
  }, [])

  const enrolledCodes = new Set(plans.map((p) => p.examCode))

  const handleEnroll = useCallback(async (examCode: string) => {
    setEnrolling(true)
    try {
      const res = await apiFetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ examCode }),
      })
      if (res.ok) {
        const plan = await res.json()
        setPlans((prev) => [...prev, plan])
        setSelectedExam(null)
        navigate(paths.app.plan.getHref(examCode))
      }
    } finally {
      setEnrolling(false)
    }
  }, [navigate])

  // Group exams by category
  const categories = [...new Set(exams.map((e) => e.category))]

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            Marketplace
          </h1>
          <p className="text-sm text-[#888]">
            Browse available exam prep plans. Add them to your study dashboard.
          </p>
        </div>

        {/* Categories */}
        {categories.map((category) => {
          const categoryExams = exams.filter((e) => e.category === category)
          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[category] ?? '#888' }}
                />
                <h2 className="text-sm font-semibold text-[#bbb]">
                  {CATEGORY_LABELS[category] ?? category}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryExams.map((exam) => {
                  const isEnrolled = enrolledCodes.has(exam.code)
                  return (
                    <button
                      key={exam.code}
                      onClick={() => setSelectedExam(exam)}
                      className="group text-left rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-5 space-y-3 hover:border-[#4f8ef7]/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#ddd] group-hover:text-[#4f8ef7] transition-colors">
                          {exam.label}
                        </p>
                        {isEnrolled && (
                          <span className="text-[10px] font-mono font-semibold text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full">
                            Enrolled
                          </span>
                        )}
                        {!exam.active && !isEnrolled && (
                          <span className="text-[10px] font-mono font-semibold text-[#888] bg-[#888]/10 px-2 py-0.5 rounded-full">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#888]">{exam.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog */}
      {selectedExam && (
        <ExamDialog
          exam={selectedExam}
          isEnrolled={enrolledCodes.has(selectedExam.code)}
          enrolling={enrolling}
          onEnroll={() => handleEnroll(selectedExam.code)}
          onClose={() => setSelectedExam(null)}
          onViewPlan={() => {
            setSelectedExam(null)
            navigate(paths.app.plan.getHref(selectedExam.code))
          }}
        />
      )}
    </div>
  )
}

const ExamDialog = ({
  exam,
  isEnrolled,
  enrolling,
  onEnroll,
  onClose,
  onViewPlan,
}: {
  exam: Exam
  isEnrolled: boolean
  enrolling: boolean
  onEnroll: () => void
  onClose: () => void
  onViewPlan: () => void
}) => {
  const color = CATEGORY_COLORS[exam.category] ?? '#888'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] shadow-2xl shadow-black/40 overflow-hidden">
        {/* Color accent bar */}
        <div className="h-1" style={{ backgroundColor: color }} />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#888]">
                  {CATEGORY_LABELS[exam.category] ?? exam.category}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-[#555] hover:text-[#ddd] transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <h2 className="text-xl font-bold text-[#e8e6f0]">{exam.label}</h2>
          </div>

          {/* Description */}
          <p className="text-sm text-[#888] leading-relaxed">
            {exam.description}. Comprehensive practice tests, topic reviews, and
            AI-generated study schedules to prepare you for exam day.
          </p>

          {/* Plan details */}
          <div className="rounded-lg border border-[#1e1e2e] bg-[#13131f] p-4 space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-[#555]">
              Includes
            </p>
            <ul className="space-y-1.5">
              {[
                'Practice tests with detailed explanations',
                'AI-powered clinical vignettes',
                'Performance analytics & tracking',
                'Personalized study schedule',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-[#bbb]">
                  <span className="text-[#4f8ef7] mt-0.5">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing stub */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#e8e6f0]">Free</span>
            <span className="text-xs text-[#555]">during early access</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isEnrolled ? (
              <button
                onClick={onViewPlan}
                className="flex-1 py-2.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
              >
                View my plan
              </button>
            ) : (
              <button
                onClick={onEnroll}
                disabled={enrolling || !exam.active}
                className="flex-1 py-2.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrolling ? 'Adding...' : !exam.active ? 'Coming soon' : 'Add to my plans'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-[#1e1e2e] bg-[#13131f] text-sm font-semibold text-[#888] hover:text-[#ddd] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
