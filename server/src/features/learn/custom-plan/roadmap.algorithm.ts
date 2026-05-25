import type { Types } from 'mongoose'

// ── Types ────────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'flashcard'
  | 'daily-quiz'
  | 'topic-quiz'
  | 'subset-test'
  | 'composite-test'

export type Phase = 'learn' | 'review' | 'simulate'

export interface RoadmapDayInput {
  dayNumber: number
  date: Date
  phase: Phase
  activityType: ActivityType
  topicIds: Types.ObjectId[]
  label: string // human-readable label for the day
}

interface TopicInput {
  _id: Types.ObjectId
  label: string
  sortOrder: number
}

// ── Topic Grouping ───────────────────────────────────────────────────────────

/**
 * Group topics into clusters of 2-3 based on sort order.
 * Adjacent topics from the same document section are likely related.
 */
export function groupTopics(topics: TopicInput[]): TopicInput[][] {
  const sorted = [...topics].sort((a, b) => a.sortOrder - b.sortOrder)

  if (sorted.length <= 3) return [sorted]

  const groups: TopicInput[][] = []
  const groupSize = sorted.length <= 6 ? 2 : 3
  for (let i = 0; i < sorted.length; i += groupSize) {
    groups.push(sorted.slice(i, i + groupSize))
  }

  return groups
}

// ── Day generation helpers ───────────────────────────────────────────────────

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function groupLabel(group: TopicInput[]): string {
  return group.map((t) => t.label).join(', ')
}

function groupIds(group: TopicInput[]): Types.ObjectId[] {
  return group.map((t) => t._id)
}

// ── Main Algorithm ───────────────────────────────────────────────────────────

const MIN_DAYS = 7

/**
 * Generate a study roadmap from topics and a date range.
 *
 * @param topics - All topics for the plan
 * @param startDate - Today or plan start
 * @param examDate - Target exam date
 * @returns Array of roadmap day entries
 */
export function generateRoadmap(
  topics: TopicInput[],
  startDate: Date,
  examDate: Date
): RoadmapDayInput[] {
  const totalDays = Math.max(
    MIN_DAYS,
    Math.ceil((examDate.getTime() - startDate.getTime()) / 86400000)
  )

  const groups = groupTopics(topics)
  const allTopicIds = topics.map((t) => t._id)
  const days: RoadmapDayInput[] = []

  let dayNum = 1

  // ── Phase 1: Learn (one group at a time) ──────────────────────────────
  // Budget: ~55% of days, minimum 1 flashcard day + 1 quiz day per group
  const learnBudget = Math.max(
    groups.length * 2,
    Math.floor(totalDays * 0.55)
  )

  // Distribute learn days across groups
  const daysPerGroup = Math.max(2, Math.floor(learnBudget / groups.length))

  for (const group of groups) {
    const flashcardDays = Math.max(1, daysPerGroup - 1) // all but last day
    const ids = groupIds(group)
    const label = groupLabel(group)

    // Flashcard days
    for (let f = 0; f < flashcardDays && dayNum <= totalDays; f++) {
      days.push({
        dayNumber: dayNum,
        date: addDays(startDate, dayNum - 1),
        phase: 'learn',
        activityType: 'flashcard',
        topicIds: ids,
        label: `Study: ${label}`,
      })
      dayNum++
    }

    // Topic quiz
    if (dayNum <= totalDays) {
      days.push({
        dayNumber: dayNum,
        date: addDays(startDate, dayNum - 1),
        phase: 'learn',
        activityType: 'topic-quiz',
        topicIds: ids,
        label: `Quiz: ${label}`,
      })
      dayNum++
    }
  }

  // ── Phase 2: Review (combined subset tests) ───────────────────────────
  // Budget: ~25% of days
  const reviewBudget = Math.max(1, Math.floor(totalDays * 0.25))
  const reviewDaysAvailable = Math.min(reviewBudget, totalDays - dayNum + 1)

  if (groups.length >= 2 && reviewDaysAvailable > 0) {
    // Generate subset combinations (pairs of groups)
    const subsets: TopicInput[][] = []
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        subsets.push([...groups[i], ...groups[j]])
      }
    }

    // Distribute review days across subsets (cycle if more days than subsets)
    for (let r = 0; r < reviewDaysAvailable && dayNum <= totalDays; r++) {
      const subset = subsets[r % subsets.length]
      const ids = subset.map((t) => t._id)
      const label = `Review: ${subset.map((t) => t.label).join(', ')}`

      days.push({
        dayNumber: dayNum,
        date: addDays(startDate, dayNum - 1),
        phase: 'review',
        activityType: 'subset-test',
        topicIds: ids,
        label: label.length > 60 ? label.slice(0, 57) + '...' : label,
      })
      dayNum++
    }
  }

  // ── Phase 3: Simulate (full composite tests) ─────────────────────────
  // Fill remaining days with composite tests
  while (dayNum <= totalDays) {
    days.push({
      dayNumber: dayNum,
      date: addDays(startDate, dayNum - 1),
      phase: 'simulate',
      activityType: 'composite-test',
      topicIds: allTopicIds,
      label: 'Full Practice Test',
    })
    dayNum++
  }

  return days
}
