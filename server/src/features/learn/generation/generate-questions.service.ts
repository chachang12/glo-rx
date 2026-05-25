import Anthropic from '@anthropic-ai/sdk'
import type { Types } from 'mongoose'
import { TopicModel } from '../custom-plan/topic.model.js'
import { PlanModel } from '../plan/plan.model.js'
import {
  ExamModel,
  QuestionBankModel,
  QUESTION_TYPES,
  DEFAULT_ALLOWED_TYPES,
} from '../exam/exam.model.js'
import { validateQuestion, type QuestionShape } from '../../../config/schemas.js'
import { DEFAULT_GENERATION_REFERENCE } from './default-reference.js'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 8192
const DEFAULT_COUNT = 10
const MAX_COUNT = 25
const MIN_COUNT = 1

// Cache window: don't regenerate if we generated recently and have enough.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// In-flight lock auto-expires after this so a crashed call can't permanently
// block future generations.
const IN_FLIGHT_TTL_MS = 5 * 60 * 1000

const anthropic = new Anthropic()

export interface GenerateQuestionsInput {
  topicId: string | Types.ObjectId
  count?: number
  allowedTypes?: string[]
  /**
   * Relative weight per type. 0 = exclude this type, 1 = light, 2 = normal, 3 = heavy.
   * Types absent from the map default to weight 1 (treated as included with light weight).
   * Server normalizes weights to a per-type count distribution that sums to `count`.
   * Example: { mcq: 3, fib: 2, ordered: 0, calculation: 0 } with count=10 → 6 MCQ + 4 FIB.
   */
  typeWeights?: Record<string, number>
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  customInstructions?: string
  force?: boolean
}

export interface GenerateQuestionsResult {
  questions: QuestionShape[]
  cached: boolean
  generatedCount: number
}

export class GenerationError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
    this.name = 'GenerationError'
  }
}

function clampCount(n: number | undefined): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return DEFAULT_COUNT
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(n)))
}

/**
 * Distribute `count` questions across `types` according to `weights`.
 * - Weights default to 1 when a type is missing from the map.
 * - A weight of 0 excludes that type entirely.
 * - All zero weights or empty types → even split across `types`.
 * - Returns ordered list matching the input `types` array (zero counts are dropped from the result).
 * - Sum of returned counts always equals `count`.
 */
function distributeByWeights(
  types: string[],
  count: number,
  weights: Record<string, number> | undefined
): { type: string; count: number }[] {
  if (types.length === 0) return []

  const w = types.map((t) => Math.max(0, weights?.[t] ?? 1))
  const totalWeight = w.reduce((s, x) => s + x, 0)

  // If user zeroed everything, fall back to even split.
  const effective = totalWeight > 0 ? w : types.map(() => 1)
  const effectiveTotal = effective.reduce((s, x) => s + x, 0)

  // Initial proportional allocation, floored.
  const raw = effective.map((x) => (count * x) / effectiveTotal)
  const floors = raw.map((r) => Math.floor(r))
  let assigned = floors.reduce((s, x) => s + x, 0)

  // Distribute the remainder to the largest fractional parts.
  const remainders = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)

  const counts = [...floors]
  let cursor = 0
  while (assigned < count) {
    counts[remainders[cursor % remainders.length].i]++
    assigned++
    cursor++
  }

  return types
    .map((t, i) => ({ type: t, count: counts[i] }))
    .filter((entry) => entry.count > 0)
}

function buildQuestionsTool(allowedTypes: string[]): Anthropic.Tool {
  // The tool input schema mirrors QuestionShape but locks `type` to the
  // allowed-types subset so the model can't emit a SATA when only MCQ is
  // configured.
  return {
    name: 'record_questions',
    description:
      'Record the generated questions. The host application will validate and store the result; ' +
      'never respond with prose — always call this tool.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: allowedTypes },
              stem: { type: 'string' },
              options: {
                description:
                  'For mcq/sata/calculation/exhibit: an object with keys A,B,C,D (and optionally E for SATA). ' +
                  'For ordered: an array of strings in correct order.',
              },
              answer: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
              },
              explanation: { type: 'string' },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            },
            required: ['type', 'stem', 'options', 'answer', 'explanation'],
          },
        },
      },
      required: ['questions'],
    },
  }
}

function buildSystemPrompt(referenceText: string, opts: {
  topicLabel: string
  topicDescription: string
  parentLabel: string | null
  allowedTypes: string[]
  count: number
  distribution: { type: string; count: number }[]
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  customInstructions?: string
}): string {
  const parts: string[] = [referenceText.trim()]

  parts.push('\n---\n')
  parts.push(`PER-CALL INSTRUCTIONS:\n`)
  parts.push(`- Topic: ${opts.topicLabel}`)
  if (opts.topicDescription) parts.push(`- Topic description: ${opts.topicDescription}`)
  if (opts.parentLabel) parts.push(`- Broader context: this is a sub-topic of "${opts.parentLabel}"`)
  parts.push(`- Allowed question types for this batch: ${opts.allowedTypes.join(', ')}`)
  parts.push(`- Generate exactly ${opts.count} question(s) total.`)

  if (opts.distribution.length > 1) {
    const breakdown = opts.distribution
      .map((d) => `${d.count} of type \`${d.type}\``)
      .join(', ')
    parts.push(`- TYPE DISTRIBUTION (mandatory): ${breakdown}. Do not deviate from these counts.`)
  } else if (opts.distribution.length === 1) {
    parts.push(`- All ${opts.count} question(s) must be of type \`${opts.distribution[0].type}\`.`)
  }

  parts.push(`- Difficulty: ${opts.difficulty}`)

  if (opts.customInstructions && opts.customInstructions.trim()) {
    parts.push(`- Additional instructions from the user: ${opts.customInstructions.trim()}`)
  }

  parts.push(
    '\nFollow all formatting rules above. Anchor every question to the provided source notes — ' +
      'do not generate questions that the source does not support. If the source is too thin to ' +
      'produce the requested number of distinct questions, produce as many high-quality questions as ' +
      'the source supports rather than padding with generic items.'
  )

  return parts.join('\n')
}

function buildUserMessage(sourceNotes: string, count: number): string {
  return [
    `Generate exactly ${count} question(s) on the topic specified in the system prompt, anchored to the source notes below. ` +
      'Call the record_questions tool — do not respond with text.',
    '',
    'SOURCE NOTES:',
    '',
    sourceNotes,
  ].join('\n')
}

export async function generateQuestionsForTopic(
  input: GenerateQuestionsInput
): Promise<GenerateQuestionsResult> {
  const count = clampCount(input.count)
  const difficulty = input.difficulty ?? 'mixed'

  const topic = await TopicModel.findById(input.topicId)
  if (!topic) throw new GenerationError('Topic not found', 404)

  const plan = await PlanModel.findById(topic.planId).lean()
  if (!plan) throw new GenerationError('Plan not found', 404)

  const exam = await ExamModel.findOne({ code: plan.examCode }).lean()

  // Resolve which question types are allowed for this exam/plan.
  // Standard plan with admin-configured exam → respect that list.
  // Custom plan with no matching exam record → allow ALL question types
  //   (the user is generating from their own materials and should choose).
  // Otherwise → fall back to the conservative default (MCQ-only).
  const examAllowed =
    exam?.allowedQuestionTypes && exam.allowedQuestionTypes.length > 0
      ? exam.allowedQuestionTypes
      : plan.type === 'custom' && !exam
      ? ([...QUESTION_TYPES] as string[])
      : [...DEFAULT_ALLOWED_TYPES]

  const requestedTypes = input.allowedTypes && input.allowedTypes.length > 0
    ? input.allowedTypes
    : examAllowed

  const allowedTypes = requestedTypes.filter((t) =>
    examAllowed.includes(t as (typeof QUESTION_TYPES)[number])
  )

  if (allowedTypes.length === 0) {
    throw new GenerationError('No question types are allowed for this exam', 400)
  }

  // Resolve type distribution from weights (or even split when no weights given).
  const activeTypes = input.typeWeights
    ? allowedTypes.filter((t) => (input.typeWeights![t] ?? 1) > 0)
    : allowedTypes
  if (activeTypes.length === 0) {
    throw new GenerationError(
      'All question types were excluded by the user weights — enable at least one.',
      400
    )
  }
  const distribution = distributeByWeights(activeTypes, count, input.typeWeights)

  // Cache check (skipped on force)
  if (!input.force) {
    const lastGen = topic.generationState?.lastGeneratedAt
    const fresh = lastGen && Date.now() - new Date(lastGen).getTime() < CACHE_TTL_MS
    if (fresh) {
      const existing = await QuestionBankModel.find({ topicId: topic._id })
        .sort({ createdAt: -1 })
        .limit(count)
        .lean()
      if (existing.length >= count) {
        return {
          questions: existing.map((q) => ({
            type: q.type as QuestionShape['type'],
            stem: q.stem,
            options: q.options as QuestionShape['options'],
            answer: q.answer,
            explanation: q.explanation,
            topics: q.topics,
            difficulty: q.difficulty as QuestionShape['difficulty'],
          })),
          cached: true,
          generatedCount: existing.length,
        }
      }
    }
  }

  // Concurrency guard. If a previous generation is in flight and recent, fail
  // fast so the client can poll/retry rather than firing duplicate Claude
  // calls. Stale locks (older than IN_FLIGHT_TTL_MS) are reclaimed.
  const inFlight = topic.generationState?.inFlight
  const inFlightSince = topic.generationState?.inFlightSince
  if (inFlight) {
    const stale = inFlightSince && Date.now() - new Date(inFlightSince).getTime() > IN_FLIGHT_TTL_MS
    if (!stale) {
      throw new GenerationError('Question generation already in progress for this topic', 409)
    }
  }

  topic.set('generationState', {
    lastGeneratedAt: topic.generationState?.lastGeneratedAt ?? null,
    generatedCount: topic.generationState?.generatedCount ?? 0,
    inFlight: true,
    inFlightSince: new Date(),
  })
  await topic.save()

  try {
    // Determine source notes
    let sourceNotes = ''
    if (topic.sourceExcerpts && topic.sourceExcerpts.length > 0) {
      sourceNotes = topic.sourceExcerpts
        .map((e, i) => `[excerpt ${i + 1}]\n${e.excerpt}`)
        .join('\n\n')
    } else if (plan.type === 'standard' && exam?.aiReferenceText) {
      // For curated official plans, the admin-supplied reference text is the
      // canonical source. This is honest — the content is real, just shared.
      sourceNotes = exam.aiReferenceText
    } else {
      throw new GenerationError(
        'This topic has no source material. Upload notes or extract topics again before generating questions.',
        400
      )
    }

    // System prompt = exam-specific reference (if set) + per-call instructions
    const referenceText = exam?.aiReferenceText?.trim() || DEFAULT_GENERATION_REFERENCE
    const systemPrompt = buildSystemPrompt(referenceText, {
      topicLabel: topic.label,
      topicDescription: topic.description ?? '',
      parentLabel: await resolveParentLabel(topic.parentTopicId),
      allowedTypes: activeTypes,
      count,
      distribution,
      difficulty,
      customInstructions: input.customInstructions,
    })

    const tool = buildQuestionsTool(activeTypes)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'record_questions' },
      system: systemPrompt,
      messages: [{ role: 'user', content: buildUserMessage(sourceNotes, count) }],
    })

    const toolUse = message.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'record_questions') {
      throw new GenerationError('Model did not return a record_questions tool call', 502)
    }

    const raw = toolUse.input as { questions?: unknown }
    if (!raw || !Array.isArray(raw.questions)) {
      throw new GenerationError('record_questions call did not include a questions array', 502)
    }

    // Validate + drop bad ones
    const valid: QuestionShape[] = []
    for (const q of raw.questions) {
      const err = validateQuestion(q)
      if (err) {
        console.warn('Dropping invalid generated question:', err)
        continue
      }
      valid.push(q as QuestionShape)
    }

    if (valid.length === 0) {
      throw new GenerationError('No valid questions were produced. Please try again.', 502)
    }

    // Persist
    const sourceCitations = (topic.sourceExcerpts ?? []).map((e) => ({
      documentId: e.documentId,
      chunkIndex: e.chunkIndex,
    }))

    const docs = await QuestionBankModel.insertMany(
      valid.map((q) => ({
        examCode: plan.examCode,
        type: q.type,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation ?? '',
        topics: [topic.label],
        difficulty: q.difficulty ?? null,
        topicId: topic._id,
        planId: topic.planId,
        generatedBy: 'ai',
        generatedAt: new Date(),
        sourceCitations,
      }))
    )

    topic.set('generationState', {
      lastGeneratedAt: new Date(),
      generatedCount: (topic.generationState?.generatedCount ?? 0) + docs.length,
      inFlight: false,
      inFlightSince: null,
    })
    await topic.save()

    return {
      questions: valid,
      cached: false,
      generatedCount: docs.length,
    }
  } catch (err) {
    // Always release the lock on failure.
    topic.set('generationState', {
      lastGeneratedAt: topic.generationState?.lastGeneratedAt ?? null,
      generatedCount: topic.generationState?.generatedCount ?? 0,
      inFlight: false,
      inFlightSince: null,
    })
    await topic.save().catch(() => {})
    throw err
  }
}

async function resolveParentLabel(parentTopicId: Types.ObjectId | null | undefined): Promise<string | null> {
  if (!parentTopicId) return null
  const parent = await TopicModel.findById(parentTopicId).select('label').lean()
  return parent?.label ?? null
}
