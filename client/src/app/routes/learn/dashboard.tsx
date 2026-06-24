import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useGetMyStats, useGetLeaderboard, useGetMe, type UserStats } from '@/features/shared/user'
import { useGetVisibleExams } from '@/features/learn/exams'
import { useGetPlans, useGetReadiness, type Plan, type Readiness } from '@/features/learn/plans'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import './dashboard.css'

// Where a plan's detail page lives (standard vs custom hierarchies diverge).
const planHref = (plan: Plan) =>
  plan.type === 'custom'
    ? paths.app.customPlanDetail.getHref(plan._id)
    : paths.app.plan.getHref(plan.examCode)

const badgeFor = (label: string) =>
  label
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

export const Dashboard = () => {
  const { data: me = null } = useGetMe()
  const { data: exams = [], isLoading: examsLoading } = useGetVisibleExams()
  const { data: plans = [], isLoading: plansLoading } = useGetPlans()
  const { data: stats = null, isLoading: statsLoading } = useGetMyStats()
  const { data: leaderboard = [] } = useGetLeaderboard()

  const standardPlans = plans.filter((p) => p.type !== 'custom')
  const customPlans = plans.filter((p) => p.type === 'custom')
  const primaryPlan = standardPlans[0] ?? customPlans[0] ?? null

  // Readiness for the featured plan. Hook stays unconditional (null = idle).
  const { data: readiness } = useGetReadiness(
    primaryPlan
      ? {
          kind: primaryPlan.type === 'custom' ? 'custom' : 'standard',
          identifier: primaryPlan.type === 'custom' ? primaryPlan._id : primaryPlan.examCode,
        }
      : null
  )

  if (plansLoading || statsLoading || examsLoading) return <PageLoader />

  const firstName = me?.firstName?.trim() || me?.displayName?.split(' ')[0] || ''
  const hasActivity = (stats?.totalQuestions ?? 0) > 0
  const startHref = primaryPlan ? planHref(primaryPlan) : paths.app.marketplace.getHref()

  const dockItems: DockItem[] = [
    { key: 'new', title: 'New session', href: startHref, primary: true, icon: <PlusIcon /> },
    { key: 'plans', title: 'Plans & dates', href: paths.app.plans.getHref(), icon: <CalendarIcon /> },
    { key: 'browse', title: 'Browse exams', href: paths.app.marketplace.getHref(), icon: <FilterIcon /> },
    { key: 'board', title: 'Leaderboard', href: paths.app.leaderboard.getHref(), icon: <BookmarkIcon /> },
    { key: 'results', title: 'Results', href: paths.app.results.getHref(), icon: <ExportIcon /> },
  ]

  return (
    <div className="axeous-dashboard">
      <div className="wrap">
        <div className="soft-panel">
          {/* notch cutout the dock nests into */}
          <svg className="panel-notch" width="322" height="66" viewBox="0 0 322 66" fill="none" aria-hidden>
            <path
              d="M0,0 L322,0 L322,1 A22,22 0 0 0 300,23 L300,40 A26,26 0 0 1 274,66 L48,66 A26,26 0 0 1 22,40 L22,23 A22,22 0 0 0 0,1 Z"
              fill="var(--s-page-top)"
            />
          </svg>
          <FloatingDock items={dockItems} />

          {/* header */}
          <header className="dash-header">
            <h1>Welcome back{firstName ? `, ${firstName}` : ''}</h1>
            <Link to={startHref} className="soft-pill">
              Start practice session
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </header>

          {/* bento grid */}
          <div className="bento">
            <PlansCard plan={primaryPlan} exams={exams} readiness={readiness ?? null} />
            <MasteredCard stats={stats} />
            <AccuracyCard stats={stats} />
            <StreakCard stats={stats} />
            <ExamInCard stats={stats} />
            <RecentActivityCard stats={stats} hasActivity={hasActivity} startHref={startHref} />
            <TodaysGoalCard goal={me?.dailyGoal ?? 20} startHref={startHref} />
            <LeaderboardCard leaderboard={leaderboard} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// FLOATING DOCK (macOS-style magnify on hover, à la Aceternity)
// ============================================================

interface DockItem {
  key: string
  title: string
  href: string
  icon: ReactNode
  primary?: boolean
}

const FloatingDock = ({ items }: { items: DockItem[] }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dock = ref.current
    if (!dock) return
    const SIGMA = 70
    const BOOST = 0.28
    const LIFT = 7
    const els = () => Array.from(dock.querySelectorAll<HTMLElement>('[data-dock-item]'))
    const onMove = (e: MouseEvent) => {
      els().forEach((it) => {
        const r = it.getBoundingClientRect()
        const center = r.left + r.width / 2
        const dist = Math.abs(e.clientX - center)
        const f = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA))
        it.style.transform = `translateY(${(-LIFT * f).toFixed(2)}px) scale(${(1 + BOOST * f).toFixed(3)})`
        it.style.zIndex = f > 0.4 ? '3' : '1'
      })
    }
    const onLeave = () => {
      els().forEach((it) => {
        it.style.transform = 'translateY(0) scale(1)'
        it.style.zIndex = '1'
      })
    }
    dock.addEventListener('mousemove', onMove)
    dock.addEventListener('mouseleave', onLeave)
    return () => {
      dock.removeEventListener('mousemove', onMove)
      dock.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div className="floating-dock" ref={ref}>
      {items.map((it) => (
        <Link
          key={it.key}
          to={it.href}
          data-dock-item
          className={it.primary ? 'dock-item primary' : 'dock-item'}
          title={it.title}
          aria-label={it.title}
        >
          {it.icon}
        </Link>
      ))}
    </div>
  )
}

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="4" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <rect x="3" y="4" width="12" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6" y1="2.5" x2="6" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="2.5" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="3" y1="7.5" x2="15" y2="7.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)
const FilterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <line x1="4" y1="5.5" x2="14" y2="5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="5.5" y1="9" x2="12.5" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="7.5" y1="12.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const BookmarkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path d="M5.5 3.5 H12.5 V14.5 L9 11.6 L5.5 14.5 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)
const ExportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path d="M9 3.5 V10.5 M6.4 6 L9 3.4 L11.6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 11 V13.5 H14 V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ============================================================
// YOUR PLANS (featured)
// ============================================================

const readinessHeadline = (pct: number) => {
  if (pct <= 0) return 'Just getting started'
  if (pct < 40) return 'Building momentum'
  if (pct < 70) return 'Making progress'
  if (pct < 90) return 'Almost exam-ready'
  return "You're exam-ready"
}

const ReadinessRing = ({ pct }: { pct: number }) => {
  const C = 320 // ~2πr for r=51
  const offset = C - (C * Math.max(0, Math.min(100, pct))) / 100
  return (
    <div className="dial">
      <svg width="122" height="122" viewBox="0 0 122 122" fill="none">
        <circle cx="61" cy="61" r="51" stroke="var(--s-track)" strokeWidth="11" />
        <circle
          cx="61"
          cy="61"
          r="51"
          stroke="var(--teal)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 61 61)"
        />
      </svg>
      <div className="ring-center">
        <span className="ring-num">
          {Math.round(pct)}
          <span className="ring-pct">%</span>
        </span>
        <span className="ring-cap">Ready</span>
      </div>
    </div>
  )
}

const PlansCard = ({
  plan,
  exams,
  readiness,
}: {
  plan: Plan | null
  exams: { code: string; label: string }[]
  readiness: Readiness | null
}) => {
  const exam = plan ? exams.find((e) => e.code === plan.examCode) : undefined
  const planName = plan?.examName ?? exam?.label ?? plan?.examCode ?? ''
  const badge = badgeFor(plan?.examCode ?? planName ?? '?')

  const pct = readiness?.readiness ?? 0
  const totalTopics = readiness?.topicCount ?? 0
  const masteredTopics = readiness?.topics.filter((t) => t.mastery >= 80).length ?? 0

  return (
    <div className="soft-card span-2 row-2 plans-card">
      <div className="card-head">
        <span className="card-title">Your Plans</span>
        <Link to={paths.app.plans.getHref()} className="icon-btn" title="View all plans" aria-label="View all plans">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <line x1="8" y1="3.5" x2="8" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="3.5" y1="8" x2="12.5" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      {plan ? (
        <>
          <div className="ring-row">
            <ReadinessRing pct={pct} />
            <div className="ring-copy">
              <span className="eyebrow">Exam readiness</span>
              <div className="ring-headline">{readinessHeadline(pct)}</div>
              <div className="ring-sub">
                Master topics and answer questions to grow your score toward exam-day confidence.
              </div>
            </div>
          </div>

          <Link to={planHref(plan)} className="plan-row">
            <span className="plan-badge">{badge}</span>
            <div className="plan-row-body">
              <div className="plan-row-top">
                <span className="plan-row-name">{planName}</span>
                <span className="plan-row-count">
                  {masteredTopics} / {totalTopics} topics
                </span>
              </div>
              <div className="track">
                <div className="track-fill" style={{ width: `${totalTopics > 0 ? (masteredTopics / totalTopics) * 100 : 0}%` }} />
              </div>
            </div>
          </Link>

          <Link to={paths.app.marketplace.getHref()} className="ghost-btn">
            <span className="plus">+</span> Add a plan
          </Link>
        </>
      ) : (
        <div className="plans-empty-wrap">
          <div className="empty-title">No plans yet</div>
          <div className="empty-sub">Browse the catalog and add an exam to start tracking readiness.</div>
          <Link to={paths.app.marketplace.getHref()} className="soft-pill sm">
            Browse exams
          </Link>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SMALL STAT CARDS
// ============================================================

const StatIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="stat-icon">{children}</span>
)

const MasteredCard = ({ stats }: { stats: UserStats | null }) => {
  const mastered = stats?.masteredCount ?? 0
  const total = stats?.totalTopics ?? 0
  return (
    <div className="soft-card stat-card">
      <div className="stat-top">
        <StatIcon>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 8.4 L6.4 11.5 L13 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </StatIcon>
        <span className="stat-label">Mastered</span>
      </div>
      <div className="stat-num">
        {mastered}
        {total > 0 && <span className="stat-unit">/{total}</span>}
      </div>
      <div className="stat-foot">
        <div className="track">
          <div className="track-fill" style={{ width: `${total > 0 ? (mastered / total) * 100 : 0}%` }} />
        </div>
        <span className="stat-sub">{total > 0 ? 'Topics at 80%+' : 'No topics tracked yet'}</span>
      </div>
    </div>
  )
}

const AccuracyCard = ({ stats }: { stats: UserStats | null }) => {
  const accuracy = stats?.accuracy
  return (
    <div className="soft-card stat-card">
      <div className="stat-top">
        <StatIcon>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="8" cy="8" r="1.7" fill="currentColor" />
          </svg>
        </StatIcon>
        <span className="stat-label">Accuracy</span>
      </div>
      {accuracy != null ? (
        <div className="stat-num">
          {accuracy}
          <span className="stat-unit">%</span>
        </div>
      ) : (
        <div className="stat-num muted-num">Not started</div>
      )}
      <span className="stat-sub mt-auto">{accuracy != null ? 'Overall correct rate' : 'Answer questions to see this'}</span>
    </div>
  )
}

const StreakCard = ({ stats }: { stats: UserStats | null }) => {
  const streak = stats?.streak ?? 0
  const pips = Array.from({ length: 7 }, (_, i) => i < Math.min(streak, 7))
  return (
    <div className="soft-card stat-card">
      <div className="stat-top">
        <StatIcon>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="2.5" y="9" width="2.8" height="4.5" rx="1.2" fill="currentColor" />
            <rect x="6.6" y="6" width="2.8" height="7.5" rx="1.2" fill="currentColor" />
            <rect x="10.7" y="3" width="2.8" height="10.5" rx="1.2" fill="currentColor" />
          </svg>
        </StatIcon>
        <span className="stat-label">Streak</span>
      </div>
      <div className="stat-num">
        {streak}
        <span className="stat-unit">d</span>
      </div>
      <div className="pips mt-auto">
        {pips.map((on, i) => (
          <span key={i} className={on ? 'pip on' : 'pip'} />
        ))}
      </div>
    </div>
  )
}

const ExamInCard = ({ stats }: { stats: UserStats | null }) => {
  const days = stats?.daysToExam
  const label = stats?.nextExamLabel
  return (
    <div className="soft-card stat-card">
      <div className="stat-top">
        <StatIcon>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="2.5" y="3.5" width="11" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="5.5" y1="2" x2="5.5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10.5" y1="2" x2="10.5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </StatIcon>
        <span className="stat-label">Exam in</span>
      </div>
      {days != null ? (
        <div className="stat-num">
          {days}
          <span className="stat-unit">d</span>
        </div>
      ) : (
        <div className="stat-num muted-num">Not set</div>
      )}
      {days != null ? (
        <span className="stat-sub mt-auto">{label}</span>
      ) : (
        <Link to={paths.app.plans.getHref()} className="stat-link mt-auto">
          Set a date →
        </Link>
      )}
    </div>
  )
}

// ============================================================
// RECENT ACTIVITY
// ============================================================

const RecentActivityCard = ({
  stats,
  hasActivity,
  startHref,
}: {
  stats: UserStats | null
  hasActivity: boolean
  startHref: string
}) => (
  <div className="soft-card span-2 row-2 activity-card">
    <div className="card-head">
      <span className="card-title">Recent Activity</span>
      <span className="card-meta">{hasActivity ? 'All time' : 'Last 7 days'}</span>
    </div>

    {hasActivity ? (
      <div className="activity-real">
        <div className="activity-stat">
          <span className="activity-stat-num">{stats?.totalQuestions ?? 0}</span>
          <span className="activity-stat-label">questions answered</span>
        </div>
        {stats?.accuracy != null && (
          <div className="activity-stat">
            <span className="activity-stat-num">
              {stats.accuracy}
              <span className="stat-unit">%</span>
            </span>
            <span className="activity-stat-label">overall accuracy</span>
          </div>
        )}
        <Link to={paths.app.results.getHref()} className="ghost-btn mt-auto">
          View detailed results →
        </Link>
      </div>
    ) : (
      <div className="activity-empty">
        <div className="ghost-rows" aria-hidden>
          {[44, 38, 50].map((w, i) => (
            <div key={i} className="ghost-row">
              <span className="ghost-avatar" />
              <span className="ghost-lines">
                <span className="ghost-line" style={{ width: `${w}%` }} />
                <span className="ghost-line short" />
              </span>
              <span className="ghost-tag" />
            </div>
          ))}
        </div>
        <div className="activity-overlay">
          <div>
            <div className="empty-title">Your sessions will appear here</div>
            <div className="empty-sub">Each practice set, test, and review lands here with your score.</div>
          </div>
          <Link to={startHref} className="soft-pill sm">
            Start your first session
          </Link>
        </div>
      </div>
    )}
  </div>
)

// ============================================================
// TODAY'S GOAL  (no per-day count exists server-side — present the
// configured goal + CTA rather than fabricating a "done today" number)
// ============================================================

// `done` has no per-day source server-side yet, so it stays 0 (accurate for a
// fresh day; never over-claims). Wire it up once a daily-count endpoint exists.
const TodaysGoalCard = ({ goal, startHref }: { goal: number; startHref: string }) => {
  const done = 0
  return (
    <div className="soft-card span-2 wide-card">
      <div className="card-head">
        <span className="card-title">Today's goal</span>
        <span className="card-meta">Resets at midnight</span>
      </div>
      <div className="wide-body">
        <div className="wide-num">
          {done}
          <span className="wide-unit">/ {goal} questions</span>
        </div>
        <Link to={startHref} className="soft-chip">
          Start →
        </Link>
      </div>
      <div className="track">
        <div className="track-fill" style={{ width: `${goal > 0 ? (done / goal) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

// ============================================================
// LEADERBOARD
// ============================================================

const LeaderboardCard = ({
  leaderboard,
}: {
  leaderboard: { isMe: boolean; totalQuestions: number }[]
}) => {
  const meIndex = leaderboard.findIndex((e) => e.isMe)
  const me = meIndex >= 0 ? leaderboard[meIndex] : null
  const ranked = !!me && me.totalQuestions > 0

  const top = leaderboard.slice(0, 3)
  const maxQ = Math.max(1, ...top.map((e) => e.totalQuestions))
  const bars = top.length > 0 ? top.map((e) => Math.max(0.18, e.totalQuestions / maxQ)) : [0.58, 1, 0.76]

  return (
    <div className="soft-card span-2 wide-card">
      <div className="card-head">
        <span className="card-title">Leaderboard</span>
        <Link to={paths.app.leaderboard.getHref()} className="stat-link">
          View all →
        </Link>
      </div>
      <div className="wide-body">
        <div className="lb-copy">
          <div className="lb-title">{ranked ? `Ranked #${meIndex + 1}` : "You're unranked"}</div>
          <div className="lb-sub">
            {ranked ? 'Keep your streak going to climb the board.' : 'Finish a session this week to join the rankings.'}
          </div>
        </div>
        <div className="lb-bars" aria-hidden>
          {bars.map((h, i) => (
            <span key={i} className={i === 1 ? 'lb-bar tall' : 'lb-bar'} style={{ height: `${h * 100}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
