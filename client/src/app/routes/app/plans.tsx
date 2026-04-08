import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'

interface Exam {
  code: string
  label: string
  category: string
  description: string
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

export const Plans = () => {
  const [exams, setExams] = useState<Exam[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/exams').then((r) => r.json()).then(setExams).catch(() => {}),
      apiFetch('/api/plans').then((r) => r.json()).then(setPlans).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [])

  const enrolledCodes = new Set(plans.map((p) => p.examCode))
  const enrolledExams = exams.filter((e) => enrolledCodes.has(e.code))

  if (!ready) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
              My Plans
            </h1>
            <p className="text-sm text-[#888]">
              Your enrolled exam prep plans.
            </p>
          </div>
          <Link
            to={paths.app.marketplace.getHref()}
            className="px-4 py-2 rounded-lg border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-xs font-semibold text-[#4f8ef7] hover:border-[#4f8ef7]/60 transition-all"
          >
            + Browse marketplace
          </Link>
        </div>

        {enrolledExams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enrolledExams.map((exam) => (
              <Link
                key={exam.code}
                to={paths.app.plan.getHref(exam.code)}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-3 hover:border-[#4f8ef7]/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: CATEGORY_COLORS[exam.category] ?? '#888',
                    }}
                  />
                  <p className="text-sm font-semibold text-white group-hover:text-[#4f8ef7] transition-colors">
                    {exam.label}
                  </p>
                </div>
                <p className="text-xs text-[#888]">{exam.description}</p>
                <p className="text-xs font-mono text-[#555]">
                  View plan &rarr;
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Link
            to={paths.app.marketplace.getHref()}
            className="block rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center hover:border-[#4f8ef7]/30 transition-all space-y-2"
          >
            <p className="text-sm text-[#888]">
              No plans yet
            </p>
            <p className="text-xs text-[#4f8ef7]">
              Browse the marketplace to get started
            </p>
          </Link>
        )}
      </div>
    </div>
  )
}
