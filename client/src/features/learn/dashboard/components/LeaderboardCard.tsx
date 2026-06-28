import { Link } from 'react-router'
import { paths } from '@/config/paths'
import type { LeaderboardEntry } from '@/features/shared/user'

/** Mini leaderboard summary: the user's rank + a bar sparkline of the top three. */
export const LeaderboardCard = ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
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
