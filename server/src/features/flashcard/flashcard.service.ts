import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ExamModel } from '../exam/exam.model.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config ───────────────────────────────────────────────────────────────────

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 4096
const CHUNK_SIZE = 60_000

const anthropic = new Anthropic()

// ── Reference Loading ────────────────────────────────────────────────────────

type FlashcardFormat = 'remnote' | 'anki'

const referenceCache = new Map<string, string>()

function loadReference(format: FlashcardFormat): string {
  if (referenceCache.has(format)) {
    return referenceCache.get(format)!
  }

  const filePath = resolve(__dirname, 'references', `${format}.md`)
  const content = readFileSync(filePath, 'utf-8')
  referenceCache.set(format, content)
  return content
}

// ── Course Context ───────────────────────────────────────────────────────────

async function buildCourseContext(examCode: string): Promise<string> {
  const exam = await ExamModel.findOne({ code: examCode }).lean()
  if (!exam) return ''

  const parts = [
    `You are generating flashcards for a student preparing for the ${exam.label} exam.`,
    `Exam category: ${exam.category}.`,
    `${exam.description}.`,
    'Focus on concepts, terminology, and reasoning patterns that are directly testable on this exam.',
    'Prioritize clinical decision-making and applied knowledge over rote memorization of trivia.',
  ]

  // Use admin-managed AI reference if available
  if (exam.aiReferenceText) {
    parts.push('', '---', '', exam.aiReferenceText)
  }

  return parts.join(' ')
}

// ── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize: number = CHUNK_SIZE): string[] {
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let pos = 0

  while (pos < text.length) {
    const end = pos + chunkSize

    if (end >= text.length) {
      chunks.push(text.slice(pos))
      break
    }

    // Find nearest paragraph break before the limit
    let breakPos = text.lastIndexOf('\n\n', end)
    if (breakPos <= pos) {
      breakPos = text.lastIndexOf('\n', end)
    }
    if (breakPos <= pos) {
      breakPos = end
    }

    chunks.push(text.slice(pos, breakPos))
    pos = breakPos + 1
  }

  return chunks
}

// ── Generation ───────────────────────────────────────────────────────────────

export interface GenerateOptions {
  text: string
  examCode: string
  format?: FlashcardFormat
}

export interface GenerateResult {
  flashcards: string
  chunksProcessed: number
  format: FlashcardFormat
}

export async function generateFlashcards(
  options: GenerateOptions
): Promise<GenerateResult> {
  const { text, examCode, format = 'remnote' } = options

  const formatReference = loadReference(format)
  const courseContext = await buildCourseContext(examCode)

  const systemPrompt = [
    formatReference,
    '',
    '---',
    '',
    courseContext,
  ].join('\n')

  const chunks = chunkText(text)
  const results: string[] = []

  for (const chunk of chunks) {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content:
            'Generate flashcards from the following notes. ' +
            'Output only valid flashcard syntax — no commentary, no explanation, ' +
            'no markdown formatting around the output.\n\n' +
            chunk,
        },
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      results.push(content.text)
    }
  }

  return {
    flashcards: results.join('\n\n'),
    chunksProcessed: chunks.length,
    format,
  }
}
