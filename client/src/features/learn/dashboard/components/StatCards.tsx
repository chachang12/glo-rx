import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import type { UserStats } from '@/features/shared/user'

const StatIcon = ({ children }: { children: ReactNode }) => <span className="stat-icon">{children}</span>

export const MasteredCard = ({ stats }: { stats: UserStats | null }) => {
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

export const AccuracyCard = ({ stats }: { stats: UserStats | null }) => {
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

export const StreakCard = ({ stats }: { stats: UserStats | null }) => {
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

export const ExamInCard = ({ stats }: { stats: UserStats | null }) => {
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
