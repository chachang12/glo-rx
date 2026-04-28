import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import './plans.css'

interface Exam {
  code: string
  label: string
  category: string
  description: string
}

interface PlanRecord {
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
  nursing: '#6e9cc7',
  medical: '#5bf08a',
  law: '#a78bfa',
  accounting: '#ff4858',
}
const FALLBACK_COLOR = '#6aa8ff'

const CATEGORY_GLOWS: Record<string, string> = {
  nursing: 'radial-gradient(400px 200px at 80% -20%, rgba(110,156,199,0.18), transparent 60%)',
  medical: 'radial-gradient(400px 200px at 80% -20%, rgba(91,240,138,0.14), transparent 60%)',
  law: 'radial-gradient(400px 200px at 80% -20%, rgba(167,139,250,0.16), transparent 60%)',
  accounting: 'radial-gradient(400px 200px at 80% -20%, rgba(255,72,88,0.14), transparent 60%)',
}
const FALLBACK_GLOW = 'radial-gradient(400px 200px at 80% -20%, rgba(106,168,255,0.14), transparent 60%)'

const EXAM_TOPICS: Record<string, string[]> = {
  'nclex-rn': ['Pharmacology', 'Med-Surg', 'Pediatrics', 'OB', 'Psych', 'Fundamentals'],
}


export const Plans = () => {
  const [exams, setExams] = useState<Exam[]>([])
  const [plans, setPlans] = useState<PlanRecord[]>([])
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

  const customPlans = plans.filter((p) => p.type === 'custom')
  const standardPlans = plans.filter((p) => p.type !== 'custom')
  const enrolledCodes = new Set(standardPlans.map((p) => p.examCode))
  const enrolledExams = exams.filter((e) => enrolledCodes.has(e.code))
  const recommendedExams = exams
    .filter((e) => !enrolledCodes.has(e.code))
    .slice(0, 3)

  const primaryExamCode = enrolledExams[0]?.code

  return (
    <div className="axeous-plans">
      <div className="wrap page-bottom">
        <header className="page-header">
          <div>
            <h1>My Plans</h1>
            <p>Your enrolled exam prep and custom study plans.</p>
          </div>
          <div className="header-actions">
            <Link to={paths.app.customPlanCreate.getHref()} className="btn-primary">
              + Custom Plan
            </Link>
            <Link to={paths.app.marketplace.getHref()} className="btn-ghost">
              Browse marketplace
            </Link>
          </div>
        </header>

        <h2 className="section-label">Exam Prep Plans</h2>
        <div className="plans-grid">
          {enrolledExams.map((exam) => (
            <ExamPlanCard
              key={exam.code}
              exam={exam}
              stats={exam.code === primaryExamCode ? stats : null}
            />
          ))}
          <EmptyCard
            title="Add another exam"
            sub="Browse our supported exams or create a custom plan."
            cta="Browse exams"
            to={paths.app.marketplace.getHref()}
          />
        </div>

        <h2 className="section-label">Custom Plans</h2>
        <div className="plans-grid">
          {customPlans.map((plan) => (
            <CustomPlanCard key={plan._id} plan={plan} />
          ))}
          <EmptyCard
            title="Create a custom plan"
            sub="Upload your materials and we'll generate a personalized plan."
            cta="+ New plan"
            to={paths.app.customPlanCreate.getHref()}
          />
        </div>

        {recommendedExams.length > 0 && (
          <>
            <h2 className="section-label">Recommended for you</h2>
            <div className="plans-grid cols-3">
              {recommendedExams.map((exam) => (
                <RecCard key={exam.code} exam={exam} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Plan cards
// ============================================================

const ExamPlanCard = ({ exam, stats }: { exam: Exam; stats: Stats | null }) => {
  const color = CATEGORY_COLORS[exam.category] ?? FALLBACK_COLOR
  const glow = CATEGORY_GLOWS[exam.category] ?? FALLBACK_GLOW
  const topics = EXAM_TOPICS[exam.code] ?? []

  const mastered = stats ? `${stats.masteredCount}/${stats.totalTopics}` : '—'
  const accuracy = stats?.accuracy != null ? `${stats.accuracy}%` : '—'
  const questions = stats?.totalQuestions != null ? String(stats.totalQuestions) : '—'
  const pct =
    stats && stats.totalTopics > 0
      ? Math.round((stats.masteredCount / stats.totalTopics) * 100)
      : 0

  const subtitle =
    stats?.nextExamLabel && stats.daysToExam != null
      ? `${exam.description} · Exam in ${stats.daysToExam} days`
      : exam.description

  return (
    <div className="card plan-card" style={{ '--plan-glow': glow } as CSSProperties}>
      <div className="plan-top">
        <div className="plan-badge">
          <div
            className="plan-badge-dot"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          Exam Prep
        </div>
        <span className="plan-status status-active">Active</span>
      </div>
      <h2 className="plan-title">{exam.label}</h2>
      <p className="plan-sub">{subtitle}</p>

      <div className="plan-stats">
        <div className="plan-stat">
          <div className="plan-stat-val" style={{ color }}>{mastered}</div>
          <div className="plan-stat-label">Mastered</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat-val">{accuracy}</div>
          <div className="plan-stat-label">Accuracy</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat-val">{questions}</div>
          <div className="plan-stat-label">Questions</div>
        </div>
      </div>

      <div className="plan-progress">
        <div className="plan-progress-label">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="plan-progress-bar">
          <div
            className="plan-progress-fill"
            style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}44` }}
          />
        </div>
      </div>

      {topics.length > 0 && (
        <div className="plan-topics">
          {topics.map((t) => (
            <span key={t} className="plan-topic">{t}</span>
          ))}
        </div>
      )}

      <div className="plan-actions">
        <Link to={paths.app.plan.getHref(exam.code)} className="plan-btn primary">
          Continue studying <ArrowIcon />
        </Link>
        <Link to={paths.app.planSettings.getHref(exam.code)} className="plan-btn">
          Edit plan
        </Link>
      </div>
    </div>
  )
}

const CustomPlanCard = ({ plan }: { plan: PlanRecord }) => {
  const color = '#a78bfa'
  const glow = 'radial-gradient(400px 200px at 80% -20%, rgba(167,139,250,0.14), transparent 60%)'

  return (
    <div className="card plan-card" style={{ '--plan-glow': glow } as CSSProperties}>
      <div className="plan-top">
        <div className="plan-badge">
          <div
            className="plan-badge-dot"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          Custom
        </div>
        <span className="plan-status status-active">Active</span>
      </div>
      <h2 className="plan-title">{plan.examName ?? plan.examCode}</h2>
      <p className="plan-sub">Custom study plan</p>

      <div className="plan-stats">
        <div className="plan-stat">
          <div className="plan-stat-val" style={{ color }}>—</div>
          <div className="plan-stat-label">Mastered</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat-val">—</div>
          <div className="plan-stat-label">Accuracy</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat-val">—</div>
          <div className="plan-stat-label">Questions</div>
        </div>
      </div>

      <div className="plan-progress">
        <div className="plan-progress-label">
          <span>Progress</span>
          <span>0%</span>
        </div>
        <div className="plan-progress-bar">
          <div className="plan-progress-fill" style={{ width: '0%', background: color }} />
        </div>
      </div>

      <div className="plan-actions">
        <Link to={paths.app.customPlanDetail.getHref(plan._id)} className="plan-btn primary">
          Continue studying <ArrowIcon />
        </Link>
        <Link to={paths.app.customPlanSettings.getHref(plan._id)} className="plan-btn">
          Edit plan
        </Link>
      </div>
    </div>
  )
}

// ============================================================
// Recommended card
// ============================================================

const RecCard = ({ exam }: { exam: Exam }) => (
  <div className="card rec-card">
    <div className="rec-top">
      <span className="rec-name">{exam.label}</span>
    </div>
    <p className="rec-desc">{exam.description}</p>
    <div className="rec-meta">
      <span style={{ textTransform: 'capitalize' }}>{exam.category}</span>
    </div>
    <div className="rec-actions">
      <Link to={paths.app.plan.getHref(exam.code)} className="plan-btn">
        Start plan <ArrowIcon />
      </Link>
    </div>
  </div>
)

// ============================================================
// Empty card
// ============================================================

const EmptyCard = ({
  title,
  sub,
  cta,
  to,
}: {
  title: string
  sub: string
  cta: string
  to: string
}) => (
  <div className="empty-card">
    <div>
      <div className="empty-icon">
        <PlusIcon />
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      <Link to={to} className="plan-btn primary">
        {cta} <ArrowIcon />
      </Link>
    </div>
  </div>
)

// ============================================================
// Icons
// ============================================================

const ArrowIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12h14M13 5l7 7-7 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const PlusIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
