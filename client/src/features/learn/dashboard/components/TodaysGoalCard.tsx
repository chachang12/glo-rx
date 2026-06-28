import { Link } from 'react-router'

interface TodaysGoalCardProps {
  goal: number
  startHref: string
}

/**
 * `done` has no per-day source server-side yet, so it stays 0 (accurate for a
 * fresh day; never over-claims). Wire it up once a daily-count endpoint exists.
 */
export const TodaysGoalCard = ({ goal, startHref }: TodaysGoalCardProps) => {
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
