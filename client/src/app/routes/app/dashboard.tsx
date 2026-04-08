import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useUser } from '@/features/auth'
import { apiFetch } from '@/lib/api'
import { MetricCard } from '@/features/dashboard'
import { PageLoader } from '@/features/ui/PageLoader'

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

interface Stats {
  totalQuestions: number
  accuracy: number | null
  streak: number
  daysToExam: number | null
  sessionsCompleted: number
  avgTimePerQuestion: number | null
}

const CATEGORY_COLORS: Record<string, string> = {
  nursing: '#4f8ef7',
  medical: '#10b981',
  law: '#8b5cf6',
  accounting: '#e07b3f',
}

export const Dashboard = () => {
  const { user } = useUser()
  const [exams, setExams] = useState<Exam[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/exams').then((r) => r.json()).then(setExams).catch(() => {}),
      apiFetch('/api/plans').then((r) => r.json()).then(setPlans).catch(() => {}),
      apiFetch('/api/user/me/stats').then((r) => r.json()).then(setStats).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [])

  const enrolledCodes = new Set(plans.map((p) => p.examCode))
  const enrolledExams = exams.filter((e) => enrolledCodes.has(e.code))

  if (!ready) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[#888]">
            What would you like to practice today?
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Answered"
            value={stats?.totalQuestions ?? 0}
            sublabel="Total questions"
            accent="#4f8ef7"
          />
          <MetricCard
            label="Accuracy"
            value={stats?.accuracy != null ? `${stats.accuracy}%` : '–'}
            sublabel="Overall correct rate"
            accent="#10b981"
          />
          <MetricCard
            label="Streak"
            value={`${stats?.streak ?? 0}d`}
            sublabel="Consecutive days"
            accent="#e07b3f"
          />
          <MetricCard
            label="Exam In"
            value={stats?.daysToExam != null ? `${stats.daysToExam}d` : '–'}
            sublabel="Days remaining"
            accent="#8b5cf6"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to={paths.app.test.getHref()}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 hover:border-[#4f8ef7]/30 hover:bg-white/[0.04] transition-all"
          >
            <p className="text-sm font-semibold text-white group-hover:text-[#4f8ef7] transition-colors">
              Practice Test
            </p>
            <p className="text-xs text-[#888] mt-1">
              Start a full-length practice session
            </p>
          </Link>
          <Link
            to={paths.app.abg.getHref()}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 hover:border-[#4f8ef7]/30 hover:bg-white/[0.04] transition-all"
          >
            <p className="text-sm font-semibold text-white group-hover:text-[#4f8ef7] transition-colors">
              ABG Driller
            </p>
            <p className="text-xs text-[#888] mt-1">
              Arterial blood gas interpretation
            </p>
          </Link>
        </div>

        {/* Your Plans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#bbb]">Your Plans</h2>
            <Link
              to={paths.app.plans.getHref()}
              className="text-xs text-[#4f8ef7] hover:underline"
            >
              View all
            </Link>
          </div>
          {enrolledExams.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {enrolledExams.map((exam) => (
                <Link
                  key={exam.code}
                  to={paths.app.plan.getHref(exam.code)}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 space-y-2 hover:border-white/[0.15] hover:bg-white/[0.04] transition-all"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[exam.category] ?? '#888',
                    }}
                  />
                  <p className="text-sm font-semibold text-white group-hover:text-[#4f8ef7] transition-colors">
                    {exam.label}
                  </p>
                  <p className="text-xs text-[#555]">{exam.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Link
              to={paths.app.plans.getHref()}
              className="block rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01] p-6 text-center hover:border-[#4f8ef7]/20 transition-all"
            >
              <p className="text-sm text-[#888]">
                No plans yet — add your first exam
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
