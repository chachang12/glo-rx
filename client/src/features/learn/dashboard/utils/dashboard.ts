import { paths } from '@/config/paths'
import type { Plan } from '@/features/learn/plans'

// Where a plan's detail page lives (standard vs custom hierarchies diverge).
export const planHref = (plan: Plan) =>
  plan.type === 'custom'
    ? paths.app.customPlanDetail.getHref(plan._id)
    : paths.app.plan.getHref(plan.examCode)

// Compact initials badge for an exam code or name (e.g. "Dental Admission Test" → "DAT").
export const badgeFor = (label: string) =>
  label
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

// Human headline for a readiness percentage.
export const readinessHeadline = (pct: number) => {
  if (pct <= 0) return 'Just getting started'
  if (pct < 40) return 'Building momentum'
  if (pct < 70) return 'Making progress'
  if (pct < 90) return 'Almost exam-ready'
  return "You're exam-ready"
}
