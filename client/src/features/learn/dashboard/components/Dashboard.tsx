import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useGetMyStats, useGetLeaderboard, useGetMe } from '@/features/shared/user'
import { useGetVisibleExams } from '@/features/learn/exams'
import { useGetPlans, useGetReadiness } from '@/features/learn/plans'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { planHref } from '../utils/dashboard'
import { FloatingDock } from './FloatingDock'
import { PlansCard } from './PlansCard'
import { MasteredCard, AccuracyCard, StreakCard, ExamInCard } from './StatCards'
import { RecentActivityCard } from './RecentActivityCard'
import { TodaysGoalCard } from './TodaysGoalCard'
import { LeaderboardCard } from './LeaderboardCard'
import './dashboard.css'

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
          <FloatingDock startHref={startHref} />

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
