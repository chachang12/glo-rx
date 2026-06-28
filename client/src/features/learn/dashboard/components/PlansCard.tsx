import { Link } from 'react-router'
import { paths } from '@/config/paths'
import type { Exam } from '@/features/learn/exams'
import type { Plan, Readiness } from '@/features/learn/plans'
import { badgeFor, planHref, readinessHeadline } from '../utils/dashboard'
import { ReadinessRing } from './ReadinessRing'

interface PlansCardProps {
  plan: Plan | null
  exams: Exam[]
  readiness: Readiness | null
}

/** Featured plan card: readiness dial + the primary plan's topic progress. */
export const PlansCard = ({ plan, exams, readiness }: PlansCardProps) => {
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
