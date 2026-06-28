import { Link } from 'react-router'
import { paths } from '@/config/paths'
import type { UserStats } from '@/features/shared/user'

interface RecentActivityCardProps {
  stats: UserStats | null
  hasActivity: boolean
  startHref: string
}

/**
 * Aggregate activity when the user has answered something; otherwise a skeleton
 * empty state. There's no per-session list endpoint yet, so the active branch
 * shows all-time totals rather than fabricating individual sessions.
 */
export const RecentActivityCard = ({ stats, hasActivity, startHref }: RecentActivityCardProps) => (
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
