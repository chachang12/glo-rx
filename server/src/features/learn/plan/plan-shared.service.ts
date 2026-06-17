import type { Context } from 'hono'
import type { Types } from 'mongoose'
import { TopicModel } from '../custom-plan/topic.model.js'
import { RoadmapDayModel } from '../custom-plan/roadmap-day.model.js'
import { QuestionBankModel } from '../exam/exam.model.js'
import { computeMastery } from '../custom-plan/mastery.algorithm.js'
import { generateRoadmap } from '../custom-plan/roadmap.algorithm.js'
import { publishedQuestionFilter } from '../exam/question-visibility.js'
import {
  generateQuestionsForTopic,
  GenerationError,
} from '../generation/generate-questions.service.js'

/**
 * Business logic shared by the standard-plan (`/api/plans`) and custom-plan
 * (`/api/custom-plans`) route families. The two feature folders stay separate
 * by design, but these per-topic / roadmap / readiness operations were
 * line-for-line copies between them — they live here so they can't drift.
 *
 * Each route still does its own plan lookup + ownership check and passes the
 * resolved plan in; nothing here trusts request input directly.
 */

type PlanId = Types.ObjectId

// ── Readiness ───────────────────────────────────────────────────────────────

/** Count of published question-bank items per topic, keyed by topic id string. */
async function publishedQuestionCounts(
  topicIds: PlanId[]
): Promise<Map<string, number>> {
  const counts = await QuestionBankModel.aggregate([
    { $match: { topicId: { $in: topicIds }, status: 'published' } },
    { $group: { _id: '$topicId', count: { $sum: 1 } } },
  ])
  return new Map(counts.map((c) => [String(c._id), c.count]))
}

/**
 * Per-topic count of questions a standard-plan member can practice: the
 * exam-wide approved bank (by topic label, shared) plus the viewer's own
 * pending generations (by topicId). Keyed by topicId string. Mirrors what
 * getVisibleTopicQuestions returns, so the "Generate vs Practice" CTA is honest.
 */
async function visibleQuestionCounts(
  examCode: string,
  topics: { _id: PlanId; label: string }[],
  authId: string
): Promise<Map<string, number>> {
  const labels = topics.map((t) => t.label)
  const topicIds = topics.map((t) => t._id)
  const visibilityFilter = await publishedQuestionFilter(examCode)

  const [sharedAgg, pendingAgg] = await Promise.all([
    QuestionBankModel.aggregate([
      { $match: visibilityFilter },
      { $unwind: '$topics' },
      { $match: { topics: { $in: labels } } },
      { $group: { _id: '$topics', count: { $sum: 1 } } },
    ]),
    QuestionBankModel.aggregate([
      { $match: { topicId: { $in: topicIds }, status: 'pending', createdByAuthId: authId } },
      { $group: { _id: '$topicId', count: { $sum: 1 } } },
    ]),
  ])

  const sharedByLabel = new Map(sharedAgg.map((c) => [c._id as string, c.count as number]))
  const pendingByTopic = new Map(pendingAgg.map((c) => [String(c._id), c.count as number]))

  const result = new Map<string, number>()
  for (const t of topics) {
    result.set(
      String(t._id),
      (sharedByLabel.get(t.label) ?? 0) + (pendingByTopic.get(String(t._id)) ?? 0)
    )
  }
  return result
}

export interface ReadinessOptions {
  /** Question types the plan offers, surfaced so the UI can hide the Generate CTA. */
  allowedQuestionTypes: string[]
  /** Whether an admin-supplied reference exists (standard plans) — folds into hasSourceExcerpts. */
  examHasReference?: boolean
  /** Standard plans only: count practiceable questions exam-wide (shared +
   * viewer's own pending) instead of by this plan's topicId. */
  sharedExamCode?: string
  /** Viewer authId, required alongside sharedExamCode for the pending preview. */
  viewerAuthId?: string
}

export async function buildReadiness(planId: PlanId, opts: ReadinessOptions) {
  const topics = await TopicModel.find({ planId }).sort({ sortOrder: 1 }).lean()

  if (topics.length === 0) {
    return { readiness: 0, topicCount: 0, topics: [] }
  }

  const readiness = Math.round(
    topics.reduce((sum, t) => sum + t.mastery, 0) / topics.length
  )

  const countByTopic =
    opts.sharedExamCode && opts.viewerAuthId
      ? await visibleQuestionCounts(opts.sharedExamCode, topics, opts.viewerAuthId)
      : await publishedQuestionCounts(topics.map((t) => t._id))

  return {
    readiness,
    topicCount: topics.length,
    allowedQuestionTypes: opts.allowedQuestionTypes,
    topics: topics.map((t) => ({
      id: t._id,
      label: t.label,
      description: t.description ?? '',
      mastery: t.mastery,
      questionsAnswered: t.questionsAnswered,
      correctCount: t.correctCount,
      hasSourceExcerpts:
        (t.sourceExcerpts?.length ?? 0) > 0 || !!opts.examHasReference,
      generatedQuestionCount: countByTopic.get(String(t._id)) ?? 0,
    })),
  }
}

// ── Topic ownership ───────────────────────────────────────────────────────────

/**
 * Fetches a topic only if it belongs to the given plan. Centralizes the
 * fetch-plan-then-fetch-topic ownership check that was hand-rolled in several
 * handlers — a single source of truth avoids an authorization gap from one
 * copy drifting. Returns the lean topic, or null if it isn't part of the plan.
 */
export async function getOwnedTopic(planId: PlanId, topicId: string) {
  return TopicModel.findOne({ _id: topicId, planId }).lean()
}

// ── Practice answer / mastery ────────────────────────────────────────────────

/**
 * Records one practice answer against a topic and recomputes mastery (EMA).
 * Returns the updated topic, or null if the topic isn't part of the plan.
 */
export async function recordTopicAnswer(
  planId: PlanId,
  topicId: string,
  correct: boolean
) {
  const topic = await TopicModel.findOne({ _id: topicId, planId })
  if (!topic) return null

  // Compute new mastery from the pre-increment state, then commit all fields.
  const newMastery = computeMastery(topic.mastery, topic.questionsAnswered, correct)
  topic.questionsAnswered += 1
  if (correct) topic.correctCount += 1
  topic.mastery = newMastery
  await topic.save()

  return topic
}

// ── Cached topic questions ────────────────────────────────────────────────────

interface QuestionLike {
  _id: PlanId
  type: string
  stem: string
  options: unknown
  answer: string[]
  explanation: string
  difficulty: string | null
  status: string
}

function toQuestionDTO(q: QuestionLike) {
  return {
    id: String(q._id),
    type: q.type,
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    // True for the creator's own questions still awaiting SME review — lets the
    // client badge them. Shared/approved questions are 'published' → false.
    pendingReview: q.status === 'pending',
  }
}

/**
 * Published questions anchored to a single topic doc, shaped for the practice
 * client. Used by custom plans, where questions publish immediately and stay
 * private to that plan (anchored by topicId).
 */
export async function getPublishedTopicQuestions(topic: {
  _id: PlanId
  label: string
}) {
  const questions = await QuestionBankModel.find({
    topicId: topic._id,
    status: 'published',
  })
    .sort({ createdAt: -1 })
    .lean()

  return {
    topicId: String(topic._id),
    topicLabel: topic.label,
    questions: (questions as unknown as QuestionLike[]).map(toQuestionDTO),
  }
}

/**
 * Questions a member of a *standard* plan can practice for a topic:
 *   - the exam-wide approved/published bank for this topic label, shared across
 *     every member of the exam, plus
 *   - the requesting user's own still-`pending` generations (private preview
 *     until SME consensus publishes them to everyone).
 *
 * Shared visibility is keyed by examCode + topic label rather than topicId,
 * because each member's plan has its own Topic docs with the same labels.
 */
export async function getVisibleTopicQuestions(opts: {
  examCode: string
  topic: { _id: PlanId; label: string }
  authId: string
}) {
  const { examCode, topic, authId } = opts

  const sharedFilter = await publishedQuestionFilter(examCode)
  const [shared, ownPending] = await Promise.all([
    QuestionBankModel.find({ ...sharedFilter, topics: topic.label })
      .sort({ createdAt: -1 })
      .lean(),
    QuestionBankModel.find({
      topicId: topic._id,
      status: 'pending',
      createdByAuthId: authId,
    })
      .sort({ createdAt: -1 })
      .lean(),
  ])

  // Merge, de-duping by id (a question is only ever in one set, but be safe).
  const byId = new Map<string, QuestionLike>()
  for (const q of [...shared, ...ownPending] as unknown as QuestionLike[]) {
    byId.set(String(q._id), q)
  }

  return {
    topicId: String(topic._id),
    topicLabel: topic.label,
    questions: [...byId.values()].map(toQuestionDTO),
  }
}

// ── AI question generation ────────────────────────────────────────────────────

/**
 * Runs topic question generation and writes the JSON response, translating the
 * service's typed GenerationError into the right status. Identical handling was
 * duplicated in both route files. `body` is the request's parsed (untrusted)
 * JSON — generateQuestionsForTopic clamps/validates each field.
 */
export async function generateTopicQuestionsResponse(
  c: Context,
  topicId: PlanId,
  body: Record<string, unknown>,
  createdByAuthId: string
) {
  try {
    const result = await generateQuestionsForTopic({
      topicId,
      count: body.count as number | undefined,
      allowedTypes: body.types as string[] | undefined,
      typeWeights: body.typeWeights as Record<string, number> | undefined,
      difficulty: body.difficulty as 'easy' | 'medium' | 'hard' | 'mixed' | undefined,
      customInstructions: body.customInstructions as string | undefined,
      force: !!body.force,
      createdByAuthId,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof GenerationError) {
      return c.json({ error: err.message }, err.status as 400 | 404 | 409 | 502)
    }
    console.error('Question generation failed:', err)
    return c.json({ error: 'Question generation failed. Please try again.' }, 500)
  }
}

// ── Roadmap ───────────────────────────────────────────────────────────────────

export type RoadmapResult =
  | { ok: true; days: unknown[] }
  | { ok: false; status: 400; error: string }

/**
 * Generates and persists a study roadmap for a plan, replacing any existing
 * one. Returns a discriminated result so the route maps it to a status code.
 */
export async function generateAndPersistRoadmap(plan: {
  _id: PlanId
  examDate?: Date | null
}): Promise<RoadmapResult> {
  if (!plan.examDate) {
    return { ok: false, status: 400, error: 'Set an exam date before generating a roadmap' }
  }

  const topics = await TopicModel.find({ planId: plan._id }).sort({ sortOrder: 1 }).lean()
  if (topics.length === 0) {
    return { ok: false, status: 400, error: 'Add topics before generating a roadmap' }
  }

  const now = new Date()
  const daysUntilExam = Math.ceil((plan.examDate.getTime() - now.getTime()) / 86400000)
  if (daysUntilExam < 7) {
    return { ok: false, status: 400, error: 'Exam date must be at least 7 days away' }
  }

  const roadmapDays = generateRoadmap(topics, now, plan.examDate)

  await RoadmapDayModel.deleteMany({ planId: plan._id })
  await RoadmapDayModel.insertMany(
    roadmapDays.map((day) => ({ planId: plan._id, ...day }))
  )

  const created = await RoadmapDayModel.find({ planId: plan._id })
    .sort({ dayNumber: 1 })
    .lean()

  return { ok: true, days: created }
}

/** Roadmap days for a plan with each day's topic ids resolved to labels. */
export async function getEnrichedRoadmap(planId: PlanId) {
  const days = await RoadmapDayModel.find({ planId }).sort({ dayNumber: 1 }).lean()

  const allTopicIds = [...new Set(days.flatMap((d) => d.topicIds.map(String)))]
  const topicMap = new Map<string, string>()

  if (allTopicIds.length > 0) {
    const topics = await TopicModel.find({ _id: { $in: allTopicIds } })
      .select('label')
      .lean()
    for (const t of topics) {
      topicMap.set(String(t._id), t.label)
    }
  }

  return days.map((d) => ({
    ...d,
    topicLabels: d.topicIds.map((id) => topicMap.get(String(id)) ?? 'Unknown'),
  }))
}

/** Marks a roadmap day complete; returns the updated day or null if not found. */
export async function completeRoadmapDay(planId: PlanId, dayNumber: number) {
  return RoadmapDayModel.findOneAndUpdate(
    { planId, dayNumber },
    { $set: { completed: true } },
    { new: true }
  )
}
