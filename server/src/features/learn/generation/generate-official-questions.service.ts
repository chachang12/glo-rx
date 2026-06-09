import Anthropic from '@anthropic-ai/sdk'
import { PlanDocumentModel } from '../custom-plan/plan-document.model.js'
import { QuestionBankModel } from '../exam/exam.model.js'
import { validateQuestion, type QuestionShape } from '../../../config/schemas.js'
import { DEFAULT_GENERATION_REFERENCE } from './default-reference.js'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 8192
const DEFAULT_COUNT = 10
const MAX_COUNT = 25
const MIN_COUNT = 1

const anthropic = new Anthropic()

export interface GenerateOfficialQuestionsInput {
  examCode: string
  corpusVersion: string
  topicLabel: string
  count?: number
  allowedTypes?: string[]
  typeWeights?: Record<string, number>
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  customInstructions?: string
}

export interface GenerateOfficialQuestionsResult {
  questionIds: string[]
  generatedCount: number
  attempted: number
  droppedCount: number
}

export class OfficialGenerationError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
    this.name = 'OfficialGenerationError'
  }
}

// Per-call concurrency guard. Keyed on (examCode, corpusVersion, topicLabel)
// so two simultaneous batches against the same target can't double-write.
const inFlight = new Set<string>()
const lockKey = (input: { examCode: string; corpusVersion: string; topicLabel: string }) =>
  `${input.examCode}::${input.corpusVersion}::${input.topicLabel}`

function clampCount(n: number | undefined): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return DEFAULT_COUNT
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(n)))
}

function distributeByWeights(
  types: string[],
  count: number,
  weights: Record<string, number> | undefined
): { type: string; count: number }[] {
  if (types.length === 0) return []

  const w = types.map((t) => Math.max(0, weights?.[t] ?? 1))
  const totalWeight = w.reduce((s, x) => s + x, 0)

  const effective = totalWeight > 0 ? w : types.map(() => 1)
  const effectiveTotal = effective.reduce((s, x) => s + x, 0)

  const raw = effective.map((x) => (count * x) / effectiveTotal)
  const floors = raw.map((r) => Math.floor(r))
  let assigned = floors.reduce((s, x) => s + x, 0)

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
              sourceChunkIndex: {
                type: 'number',
                description: 'Index of the source chunk this question is anchored to, as labeled in the user message.',
              },
            },
            required: ['type', 'stem', 'options', 'answer', 'explanation'],
          },
        },
      },
      required: ['questions'],
    },
  }
}

function buildSystemPrompt(opts: {
  topicLabel: string
  examCode: string
  allowedTypes: string[]
  count: number
  distribution: { type: string; count: number }[]
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  customInstructions?: string
}): string {
  const parts: string[] = [DEFAULT_GENERATION_REFERENCE.trim()]

  parts.push('\n---\n')
  parts.push(`PER-CALL INSTRUCTIONS:`)
  parts.push(`- Exam: ${opts.examCode}`)
  parts.push(`- Topic: ${opts.topicLabel}`)
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
  parts.push(
    `- Each question MUST include a \`sourceChunkIndex\` matching the chunk it is anchored to. ` +
      `If a question synthesizes across chunks, pick the most central one.`
  )

  if (opts.customInstructions && opts.customInstructions.trim()) {
    parts.push(`- Additional instructions: ${opts.customInstructions.trim()}`)
  }

  parts.push(
    '\nAnchor every question to the provided source chunks — do not generate questions the source does not support. ' +
      'If the source is too thin to produce the requested number of distinct questions, produce as many high-quality ' +
      'questions as the source supports rather than padding with generic items.'
  )

  return parts.join('\n')
}

interface SourceChunk {
  documentId: string
  filePath: string
  fileHash: string
  chunkIndex: number
  text: string
}

function buildUserMessage(chunks: SourceChunk[], topicLabel: string, count: number): string {
  const labeled = chunks
    .map((c, i) => `[chunk ${i}] (from ${c.filePath}, chunkIndex ${c.chunkIndex})\n${c.text}`)
    .join('\n\n')
  return [
    `Generate exactly ${count} question(s) on the topic "${topicLabel}", anchored to the source chunks below. ` +
      'Call the record_questions tool — do not respond with text. ' +
      'For each question, set `sourceChunkIndex` to the [chunk N] index it is anchored to (0-based as labeled here).',
    '',
    'SOURCE CHUNKS:',
    '',
    labeled,
  ].join('\n')
}

export async function generateOfficialQuestions(
  input: GenerateOfficialQuestionsInput
): Promise<GenerateOfficialQuestionsResult> {
  const count = clampCount(input.count)
  const difficulty = input.difficulty ?? 'mixed'
  const allowedTypes = input.allowedTypes && input.allowedTypes.length > 0
    ? input.allowedTypes
    : ['mcq']

  const activeTypes = input.typeWeights
    ? allowedTypes.filter((t) => (input.typeWeights![t] ?? 1) > 0)
    : allowedTypes
  if (activeTypes.length === 0) {
    throw new OfficialGenerationError(
      'All question types were excluded by the user weights — enable at least one.',
      400
    )
  }
  const distribution = distributeByWeights(activeTypes, count, input.typeWeights)

  const key = lockKey(input)
  if (inFlight.has(key)) {
    throw new OfficialGenerationError(
      'A generation batch is already in flight for this exam/version/topic. Wait for it to finish.',
      409
    )
  }
  inFlight.add(key)

  try {
    // Pull official corpus documents for this exam/version.
    const docs = await PlanDocumentModel.find({
      corpusSource: 'official',
      examCode: input.examCode,
      corpusVersion: input.corpusVersion,
    }).lean()

    if (docs.length === 0) {
      throw new OfficialGenerationError(
        `No official corpus documents found for ${input.examCode}@${input.corpusVersion}. ` +
          'Load the corpus first.',
        400
      )
    }

    const chunks: SourceChunk[] = []
    for (const d of docs) {
      if (!d.chunks || d.chunks.length === 0) continue
      for (const c of d.chunks) {
        chunks.push({
          documentId: String(d._id),
          filePath: d.filePath ?? d.fileName,
          fileHash: d.fileHash ?? '',
          chunkIndex: c.index,
          text: c.text,
        })
      }
    }

    if (chunks.length === 0) {
      throw new OfficialGenerationError(
        `Corpus ${input.examCode}@${input.corpusVersion} has no chunked content yet.`,
        400
      )
    }

    const systemPrompt = buildSystemPrompt({
      topicLabel: input.topicLabel,
      examCode: input.examCode,
      allowedTypes: activeTypes,
      count,
      distribution,
      difficulty,
      customInstructions: input.customInstructions,
    })

    const tool = buildQuestionsTool(activeTypes)

    let message: Anthropic.Message
    try {
      message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'record_questions' },
        system: systemPrompt,
        messages: [{ role: 'user', content: buildUserMessage(chunks, input.topicLabel, count) }],
      })
    } catch (err) {
      console.error('[generate-official-questions] Claude API failed:', {
        examCode: input.examCode,
        corpusVersion: input.corpusVersion,
        topicLabel: input.topicLabel,
        error: (err as Error).message,
      })
      throw new OfficialGenerationError('Question generation failed at the model layer.', 502)
    }

    const toolUse = message.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'record_questions') {
      throw new OfficialGenerationError('Model did not return a record_questions tool call', 502)
    }

    const raw = toolUse.input as { questions?: unknown }
    if (!raw || !Array.isArray(raw.questions)) {
      throw new OfficialGenerationError('record_questions call did not include a questions array', 502)
    }

    const attempted = raw.questions.length
    const valid: Array<{ q: QuestionShape; sourceChunkIndex: number | null }> = []
    for (const q of raw.questions) {
      const err = validateQuestion(q)
      if (err) {
        console.warn('[generate-official-questions] dropping invalid question:', err)
        continue
      }
      const sourceChunkIndex = typeof (q as Record<string, unknown>).sourceChunkIndex === 'number'
        ? ((q as Record<string, unknown>).sourceChunkIndex as number)
        : null
      valid.push({ q: q as QuestionShape, sourceChunkIndex })
    }

    if (valid.length === 0) {
      throw new OfficialGenerationError('No valid questions were produced. Please try again.', 502)
    }

    // Persist each as draft. Citations use fileHash + filePath + chunkIndex + excerpt.
    const docs2 = await QuestionBankModel.insertMany(
      valid.map(({ q, sourceChunkIndex }) => {
        const idx = sourceChunkIndex !== null && sourceChunkIndex >= 0 && sourceChunkIndex < chunks.length
          ? sourceChunkIndex
          : 0
        const chunk = chunks[idx]
        const excerpt = chunk.text.length > 500 ? `${chunk.text.slice(0, 500)}…` : chunk.text
        return {
          examCode: input.examCode,
          topicId: null,
          planId: null,
          type: q.type,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation ?? '',
          topics: [input.topicLabel],
          difficulty: q.difficulty ?? null,
          generatedBy: 'ai',
          generatedAt: new Date(),
          corpusVersion: input.corpusVersion,
          sourceCitations: [
            {
              documentId: null,
              fileHash: chunk.fileHash,
              filePath: chunk.filePath,
              chunkIndex: chunk.chunkIndex,
              excerpt,
            },
          ],
          status: 'draft',
          releaseId: null,
          approvalCount: 0,
          rejectionCount: 0,
          votes: [],
        }
      })
    )

    return {
      questionIds: docs2.map((d) => String(d._id)),
      generatedCount: docs2.length,
      attempted,
      droppedCount: attempted - docs2.length,
    }
  } finally {
    inFlight.delete(key)
  }
}
