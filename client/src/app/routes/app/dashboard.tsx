import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useUser } from '@/features/auth'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import './dashboard.css'

interface Exam {
  code: string
  label: string
  category: string
  description: string
  active: boolean
}

interface Plan {
  _id: string
  examCode: string
  type?: 'standard' | 'custom'
  examName?: string
  status: string
}

interface Stats {
  totalQuestions: number
  accuracy: number | null
  streak: number
  daysToExam: number | null
  nextExamLabel: string | null
  masteredCount: number
  totalTopics: number
}

const CATEGORY_COLORS: Record<string, string> = {
  nursing: '#6aa8ff',
  medical: '#6e9cc7',
  law: '#a78bfa',
  accounting: '#ff4858',
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

  if (!ready) return <PageLoader />

  const firstName = user?.name?.split(' ')[0] ?? ''
  const customPlans = plans.filter((p) => p.type === 'custom')
  const standardPlans = plans.filter((p) => p.type !== 'custom')
  const enrolledCodes = new Set(standardPlans.map((p) => p.examCode))
  const enrolledExams = exams.filter((e) => enrolledCodes.has(e.code))
  const hasAnyPlan = plans.length > 0
  const hasActivity = (stats?.totalQuestions ?? 0) > 0

  const headerSub = stats?.nextExamLabel
    ? `${stats.nextExamLabel}${stats.daysToExam != null ? ` · ${stats.daysToExam} days remaining` : ''}`
    : hasAnyPlan
      ? 'Set an exam date in your plan to see your countdown'
      : 'Add an exam to start tracking your progress'

  return (
    <div className="axeous-dashboard">
      <div className="wrap">
        <header className="dash-header">
          <h1>Welcome{firstName ? `, ${firstName}` : ''}</h1>
          <p>{headerSub}</p>
        </header>

        <Metrics stats={stats} />

        <div className="bottom-row">
          <div className="card" style={{ padding: 24 }}>
            <div className="plans-head">
              <h3>Your Plans</h3>
              <Link to={paths.app.plans.getHref()} className="view-all">View all →</Link>
            </div>
            {enrolledExams.length > 0 || customPlans.length > 0 ? (
              <>
                {customPlans.map((plan) => (
                  <Link
                    key={plan._id}
                    to={paths.app.customPlanDetail.getHref(plan._id)}
                    className="plan-item"
                  >
                    <span className="plan-dot" style={{ background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }} />
                    <div className="plan-info">
                      <div className="plan-name">{plan.examName ?? plan.examCode}</div>
                      <div className="plan-sub">Custom plan</div>
                    </div>
                  </Link>
                ))}
                {enrolledExams.map((exam) => {
                  const color = CATEGORY_COLORS[exam.category] ?? '#6e9cc7'
                  return (
                    <Link
                      key={exam.code}
                      to={paths.app.plan.getHref(exam.code)}
                      className="plan-item"
                    >
                      <span className="plan-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                      <div className="plan-info">
                        <div className="plan-name">{exam.label}</div>
                        <div className="plan-sub">{exam.description}</div>
                      </div>
                    </Link>
                  )
                })}
              </>
            ) : (
              <Link to={paths.app.marketplace.getHref()} className="plans-empty">
                No plans yet — browse exams to get started
              </Link>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="plans-head">
              <h3>Recent Activity</h3>
            </div>
            {hasActivity ? (
              <div className="activity-empty">
                <div className="activity-empty-num">{stats?.totalQuestions ?? 0}</div>
                <div className="activity-empty-label">questions answered</div>
                {stats?.accuracy != null && (
                  <div className="activity-empty-sub">{stats.accuracy}% correct overall</div>
                )}
              </div>
            ) : (
              <Link
                to={hasAnyPlan && stats?.nextExamLabel
                  ? paths.app.plans.getHref()
                  : paths.app.marketplace.getHref()}
                className="plans-empty"
              >
                {hasAnyPlan
                  ? 'Start a practice session to track your activity'
                  : 'Add a plan to start practising'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// METRICS
// ============================================================

const Metrics = ({ stats }: { stats: Stats | null }) => {
  const mastered = stats?.masteredCount ?? 0
  const total = stats?.totalTopics ?? 0
  const accuracy = stats?.accuracy
  const streak = stats?.streak ?? 0
  const daysToExam = stats?.daysToExam
  const examLabel = stats?.nextExamLabel

  return (
    <div className="metrics">
      <div className="card metric-card">
        <div className="metric-label">Mastered</div>
        <div className="metric-val">
          {mastered}
          {total > 0 && <span className="unit">/{total}</span>}
        </div>
        <div className="metric-sub">
          <span>{total > 0 ? 'Topics at 80%+' : 'No topics tracked yet'}</span>
        </div>
      </div>

      <div className="card metric-card">
        <div className="metric-label">Accuracy</div>
        <div className="metric-val">
          {accuracy != null ? accuracy : '—'}
          {accuracy != null && <span className="unit">%</span>}
        </div>
        <div className="metric-sub">
          <span>{accuracy != null ? 'Overall correct rate' : 'Answer questions to see this'}</span>
        </div>
      </div>

      <div className="card metric-card">
        <div className="metric-label">Streak</div>
        <div className="metric-val">
          {streak}
          <span className="unit">d</span>
        </div>
        <div className="metric-sub">{streak > 0 ? 'Consecutive days' : 'Practice today to start a streak'}</div>
      </div>

      <div className="card metric-card">
        <div className="metric-label">Exam in</div>
        <div className="metric-val">
          {daysToExam != null ? daysToExam : '—'}
          {daysToExam != null && <span className="unit">d</span>}
        </div>
        <div className="metric-sub">{examLabel ?? 'Set a date in your plan'}</div>
      </div>
    </div>
  )
}
