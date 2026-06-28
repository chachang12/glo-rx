import crypto from 'node:crypto'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { requireAuth } from '../../../middleware/auth.js'
import { requireUsage } from '../../../middleware/usage.js'
import { requireCustomPlanQuota } from '../../../middleware/capability.js'
import { capabilitiesForUser } from '../../shared/user/user.tier.js'
import type { AuthEnv } from '../../../types.js'
import { PlanModel } from '../plan/plan.model.js'
import { TopicModel } from './topic.model.js'
import { PlanDocumentModel } from './plan-document.model.js'
import { parseFile, getFileType, chunkText } from './parse.service.js'
import { extractTopics } from './extract-topics.service.js'
import {
  buildReadiness,
  recordTopicAnswer,
  getOwnedTopic,
  getPublishedTopicQuestions,
  generateTopicQuestionsResponse,
  generateAndPersistRoadmap,
  getEnrichedRoadmap,
  completeRoadmapDay,
} from '../plan/plan-shared.service.js'
import { QUESTION_TYPES } from '../../../config/question-types.js'

// Custom plans let the user generate from their own materials, so every
// supported question type is offered.
const CUSTOM_PLAN_QUESTION_TYPES: string[] = [...QUESTION_TYPES]

import { MAX_UPLOAD_FILE_SIZE, MAX_PLAN_DOCS_SIZE } from '../../../config/limits.js'

const customPlanRoutes = new Hono<AuthEnv>()

// ── Public routes (no auth) ─────────────────────────────────────────────────

// GET /shared/:shareCode — Preview a shared plan
customPlanRoutes.get('/shared/:shareCode', async (c) => {
  const { shareCode } = c.req.param()

  const plan = await PlanModel.findOne({ shareCode, isPublished: true, type: 'custom' }).lean()
  if (!plan) return c.json({ error: 'Shared plan not found' }, 404)

  const topics = await TopicModel.find({ planId: plan._id })
    .select('label sortOrder')
    .sort({ sortOrder: 1 })
    .lean()

  const docCount = await PlanDocumentModel.countDocuments({ planId: plan._id })

  return c.json({
    examName: plan.examName,
    examDate: plan.examDate,
    topicCount: topics.length,
    topics: topics.map((t) => t.label),
    documentCount: docCount,
  })
})

// ── Auth required for everything below ──────────────────────────────────────

customPlanRoutes.use(requireAuth)

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOwnedPlan(authId: string, planId: string) {
  const plan = await PlanModel.findOne({ _id: planId, authId, type: 'custom' })
  return plan
}

// ── POST / — Create a custom plan ───────────────────────────────────────────

customPlanRoutes.post('/', requireCustomPlanQuota, async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json()

  if (!body.examName || typeof body.examName !== 'string' || !body.examName.trim()) {
    return c.json({ error: 'examName is required' }, 400)
  }

  const slug = `custom-${crypto.randomUUID().slice(0, 10)}`

  const plan = await PlanModel.create({
    authId: authUser.id,
    examCode: slug,
    type: 'custom',
    examName: body.examName.trim(),
    examDate: body.examDate ?? null,
    dailyGoal: body.dailyGoal ?? null,
  })

  return c.json(plan, 201)
})

// ── POST /:planId/upload — Upload and parse a file ──────────────────────────

customPlanRoutes.post(
  '/:planId/upload',
  bodyLimit({ maxSize: MAX_UPLOAD_FILE_SIZE }),
  async (c) => {
    const authUser = c.get('user')
    const { planId } = c.req.param()

    const plan = await getOwnedPlan(authUser.id, planId)
    if (!plan) return c.json({ error: 'Plan not found' }, 404)

    // Enforce the per-plan file-count quota (tier-based).
    const { maxFilesPerPlan } = capabilitiesForUser(c.get('appUser'))
    const fileCount = await PlanDocumentModel.countDocuments({ planId: plan._id })
    if (fileCount >= maxFilesPerPlan) {
      return c.json(
        {
          error: `File limit reached for this plan (${maxFilesPerPlan}). Upgrade to Axeous Pro for more uploads.`,
          reason: 'tier_limit',
          capability: 'maxFilesPerPlan',
        },
        402
      )
    }

    // Check cumulative size limit
    if (plan.totalDocumentSize >= MAX_PLAN_DOCS_SIZE) {
      return c.json({ error: 'Plan document storage limit reached (50MB)' }, 400)
    }

    const formData = await c.req.parseBody()
    const file = formData['file']

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file uploaded' }, 400)
    }

    const fileName = file.name
    const fileType = getFileType(fileName)

    if (!fileType) {
      return c.json({ error: 'Unsupported file type. Use PDF, DOCX, or PPTX.' }, 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileSize = buffer.length

    if (plan.totalDocumentSize + fileSize > MAX_PLAN_DOCS_SIZE) {
      return c.json({ error: 'File would exceed plan storage limit (50MB)' }, 400)
    }

    // Parse the file
    let parsedText: string
    try {
      console.log(`Parsing ${fileType} file: ${fileName} (${fileSize} bytes)`)
      parsedText = await parseFile(buffer, fileType)
      console.log(`Parsed successfully: ${parsedText.length} chars`)
    } catch (err) {
      console.error('File parse error:', err)
      return c.json({ error: 'Failed to parse file. It may be corrupted or password-protected.' }, 400)
    }

    if (!parsedText.trim()) {
      return c.json({ error: 'No text could be extracted from the file.' }, 400)
    }

    const chunks = chunkText(parsedText)

    // Store the document
    const doc = await PlanDocumentModel.create({
      planId: plan._id,
      fileName,
      fileType,
      fileSize,
      parsedText,
      charCount: parsedText.length,
      chunks,
    })

    // Update plan cumulative size
    await PlanModel.updateOne(
      { _id: plan._id },
      { $inc: { totalDocumentSize: fileSize } }
    )

    return c.json({
      id: doc._id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      charCount: doc.charCount,
    }, 201)
  }
)

// ── GET /:planId/documents — List uploaded documents ────────────────────────

customPlanRoutes.get('/:planId/documents', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const docs = await PlanDocumentModel.find({ planId: plan._id })
    .select('-parsedText')
    .sort({ uploadedAt: 1 })
    .lean()

  return c.json(docs)
})

// ── POST /:planId/extract-topics — AI topic extraction ──────────────────────

customPlanRoutes.post('/:planId/extract-topics', requireUsage, async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const docs = await PlanDocumentModel.find({ planId: plan._id })
  if (docs.length === 0) {
    return c.json({ error: 'No documents uploaded yet' }, 400)
  }

  // Backfill chunks for documents uploaded before chunking was wired up.
  // Persist so subsequent reads (e.g. question generation) skip the work.
  for (const d of docs) {
    if ((!d.chunks || d.chunks.length === 0) && d.parsedText?.trim()) {
      d.set('chunks', chunkText(d.parsedText))
      await d.save()
    }
  }

  const documentInputs = docs
    .filter((d) => d.chunks && d.chunks.length > 0)
    .map((d) => ({
      id: String(d._id),
      fileName: d.fileName,
      chunks: d.chunks.map((c) => ({
        index: c.index,
        text: c.text,
        charStart: c.charStart,
        charEnd: c.charEnd,
      })),
    }))

  if (documentInputs.length === 0) {
    return c.json({ error: 'Documents have no extractable content yet' }, 400)
  }

  try {
    const enriched = await extractTopics(documentInputs)

    // Stash the enriched citations on the plan so confirm-topics can pull them
    // back out by label even though the review UI only edits labels.
    plan.set(
      'pendingTopics',
      enriched.map((t) => ({
        label: t.label,
        description: t.description,
        parentLabel: t.parentLabel ?? null,
        sourceChunks: t.sourceChunks,
      }))
    )
    await plan.save()

    return c.json({
      topics: enriched.map((t) => t.label),
      enrichedTopics: enriched,
    })
  } catch (err) {
    console.error('Topic extraction failed:', err)
    return c.json({ error: 'Failed to extract topics. Please try again.' }, 500)
  }
})

// ── POST /:planId/confirm-topics — Save reviewed topics ─────────────────────

customPlanRoutes.post('/:planId/confirm-topics', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const body = await c.req.json()

  if (!Array.isArray(body.topics) || body.topics.length === 0) {
    return c.json({ error: 'At least one topic is required' }, 400)
  }

  if (!body.topics.every((t: unknown) => typeof t === 'string' && t.trim())) {
    return c.json({ error: 'All topics must be non-empty strings' }, 400)
  }

  // Look up enrichment data from the most recent extraction. Topics whose
  // label is unchanged from extraction get descriptions + sourceExcerpts;
  // user-typed or renamed topics fall through with bare labels.
  const enrichmentByLabel = new Map<string, typeof plan.pendingTopics[number]>()
  for (const pt of plan.pendingTopics ?? []) {
    enrichmentByLabel.set(pt.label.toLowerCase().trim(), pt)
  }

  // First pass: build the docs with parentLabel still as a string
  const labels: string[] = body.topics.map((l: string) => l.trim())
  const drafts = labels.map((label, i) => {
    const match = enrichmentByLabel.get(label.toLowerCase())
    return {
      label,
      description: match?.description ?? '',
      parentLabel: match?.parentLabel ?? null,
      sortOrder: i,
      sourceExcerpts:
        match?.sourceChunks.map((c) => ({
          documentId: c.documentId,
          chunkIndex: c.chunkIndex,
          excerpt: c.excerpt,
        })) ?? [],
    }
  })

  // Replace existing topics (idempotent re-confirmation)
  await TopicModel.deleteMany({ planId: plan._id })

  // Insert without parentTopicId first
  const created = await TopicModel.insertMany(
    drafts.map((d) => ({
      planId: plan._id,
      label: d.label,
      description: d.description,
      sortOrder: d.sortOrder,
      sourceExcerpts: d.sourceExcerpts,
    }))
  )

  // Resolve parentLabel → parentTopicId in a second pass
  const labelToId = new Map(created.map((t) => [t.label.toLowerCase(), t._id]))
  await Promise.all(
    drafts.map(async (d, i) => {
      if (!d.parentLabel) return
      const parentId = labelToId.get(d.parentLabel.toLowerCase())
      if (!parentId || parentId.equals(created[i]._id)) return
      await TopicModel.updateOne({ _id: created[i]._id }, { $set: { parentTopicId: parentId } })
    })
  )

  // Clear pendingTopics — they're now persisted as Topic records
  plan.set('pendingTopics', [])
  await plan.save()

  const final = await TopicModel.find({ planId: plan._id }).sort({ sortOrder: 1 }).lean()
  return c.json(final, 201)
})

// ── GET /:planId/topics — Get topics with mastery ───────────────────────────

customPlanRoutes.get('/:planId/topics', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topics = await TopicModel.find({ planId: plan._id })
    .sort({ sortOrder: 1 })
    .lean()

  return c.json(topics)
})

// ── PATCH /:planId/topics/:topicId/record — Record a practice answer ────────

customPlanRoutes.patch('/:planId/topics/:topicId/record', async (c) => {
  const authUser = c.get('user')
  const { planId, topicId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const body = await c.req.json()
  if (typeof body.correct !== 'boolean') {
    return c.json({ error: 'correct (boolean) is required' }, 400)
  }

  const topic = await recordTopicAnswer(plan._id, topicId, body.correct)
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  return c.json(topic)
})

// ── POST /:planId/topics/:topicId/generate-questions — AI question gen ─────

customPlanRoutes.post(
  '/:planId/topics/:topicId/generate-questions',
  requireUsage,
  async (c) => {
    const authUser = c.get('user')
    const { planId, topicId } = c.req.param()

    const plan = await getOwnedPlan(authUser.id, planId)
    if (!plan) return c.json({ error: 'Plan not found' }, 404)

    // Verify topic belongs to this plan
    const topic = await getOwnedTopic(plan._id, topicId)
    if (!topic) return c.json({ error: 'Topic not found' }, 404)

    // Body was parsed by requireUsage.
    const body = c.get('parsedBody')
    return generateTopicQuestionsResponse(c, topic._id, body, authUser.id)
  }
)

// ── GET /:planId/topics/:topicId/questions — Cached topic questions ─────────

customPlanRoutes.get('/:planId/topics/:topicId/questions', async (c) => {
  const authUser = c.get('user')
  const { planId, topicId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const topic = await getOwnedTopic(plan._id, topicId)
  if (!topic) return c.json({ error: 'Topic not found' }, 404)

  return c.json(await getPublishedTopicQuestions(topic))
})

// ── GET /:planId/readiness — Overall readiness score ────────────────────────

customPlanRoutes.get('/:planId/readiness', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  return c.json(
    await buildReadiness(plan._id, {
      allowedQuestionTypes: CUSTOM_PLAN_QUESTION_TYPES,
    })
  )
})

// ── POST /:planId/publish — Publish a plan for sharing ──────────────────────

customPlanRoutes.post('/:planId/publish', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  // Check that plan has topics
  const topicCount = await TopicModel.countDocuments({ planId: plan._id })
  if (topicCount === 0) {
    return c.json({ error: 'Add topics before publishing' }, 400)
  }

  if (plan.isPublished && plan.shareCode) {
    return c.json({ shareCode: plan.shareCode, alreadyPublished: true })
  }

  const shareCode = crypto.randomUUID().slice(0, 12)

  plan.isPublished = true
  plan.shareCode = shareCode
  await plan.save()

  return c.json({ shareCode })
})

// ── POST /:planId/unpublish — Unpublish a plan ─────────────────────────────

customPlanRoutes.post('/:planId/unpublish', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  plan.isPublished = false
  plan.shareCode = undefined
  await plan.save()

  return c.json({ success: true })
})

// ── POST /shared/:shareCode/clone — Clone a shared plan into your account ───

customPlanRoutes.post('/shared/:shareCode/clone', requireCustomPlanQuota, async (c) => {
  const authUser = c.get('user')
  const { shareCode } = c.req.param()

  const sourcePlan = await PlanModel.findOne({ shareCode, isPublished: true, type: 'custom' }).lean()
  if (!sourcePlan) return c.json({ error: 'Shared plan not found' }, 404)

  // Check if user already cloned this plan
  const existing = await PlanModel.findOne({
    authId: authUser.id,
    type: 'custom',
    examName: sourcePlan.examName,
  }).lean()

  if (existing) {
    return c.json({ error: 'You already have a plan with this name' }, 409)
  }

  // Create new plan for this user
  const slug = `custom-${crypto.randomUUID().slice(0, 10)}`

  const newPlan = await PlanModel.create({
    authId: authUser.id,
    examCode: slug,
    type: 'custom',
    examName: sourcePlan.examName,
    examDate: sourcePlan.examDate,
    dailyGoal: sourcePlan.dailyGoal,
  })

  // Clone topics (mastery reset to 0)
  const sourceTopics = await TopicModel.find({ planId: sourcePlan._id })
    .sort({ sortOrder: 1 })
    .lean()

  if (sourceTopics.length > 0) {
    await TopicModel.insertMany(
      sourceTopics.map((t) => ({
        planId: newPlan._id,
        label: t.label,
        sortOrder: t.sortOrder,
      }))
    )
  }

  // Clone documents (share the parsed text)
  const sourceDocs = await PlanDocumentModel.find({ planId: sourcePlan._id }).lean()

  if (sourceDocs.length > 0) {
    let totalSize = 0
    await PlanDocumentModel.insertMany(
      sourceDocs.map((d) => {
        totalSize += d.fileSize
        return {
          planId: newPlan._id,
          fileName: d.fileName,
          fileType: d.fileType,
          fileSize: d.fileSize,
          parsedText: d.parsedText,
          charCount: d.charCount,
          chunks: d.chunks ?? chunkText(d.parsedText),
        }
      })
    )

    await PlanModel.updateOne(
      { _id: newPlan._id },
      { $set: { totalDocumentSize: totalSize } }
    )
  }

  return c.json(newPlan, 201)
})

// ── POST /:planId/roadmap/generate — Generate study roadmap ─────────────────

customPlanRoutes.post('/:planId/roadmap/generate', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const result = await generateAndPersistRoadmap(plan)
  if (!result.ok) return c.json({ error: result.error }, result.status)

  return c.json(result.days, 201)
})

// ── GET /:planId/roadmap — Get study roadmap ────────────────────────────────

customPlanRoutes.get('/:planId/roadmap', async (c) => {
  const authUser = c.get('user')
  const { planId } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  return c.json(await getEnrichedRoadmap(plan._id))
})

// ── PATCH /:planId/roadmap/:dayNumber/complete — Mark a day complete ────────

customPlanRoutes.patch('/:planId/roadmap/:dayNumber/complete', async (c) => {
  const authUser = c.get('user')
  const { planId, dayNumber } = c.req.param()

  const plan = await getOwnedPlan(authUser.id, planId)
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const day = await completeRoadmapDay(plan._id, parseInt(dayNumber))
  if (!day) return c.json({ error: 'Roadmap day not found' }, 404)

  return c.json(day)
})

export default customPlanRoutes
