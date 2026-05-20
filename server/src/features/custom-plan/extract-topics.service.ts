import Anthropic from '@anthropic-ai/sdk'
import type { DocumentChunk } from './parse.service.js'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 4096

// Soft cap on chunks sent in one call. Roughly 100 chunks * ~2k chars = ~200k chars
// (~50k tokens), comfortably within Haiku's input window.
const MAX_CHUNKS_PER_CALL = 120

const anthropic = new Anthropic()

export interface ExtractDocumentInput {
  id: string
  fileName: string
  chunks: DocumentChunk[]
}

export interface ExtractedTopicSourceChunk {
  documentId: string
  chunkIndex: number
  excerpt: string
}

export interface ExtractedTopic {
  label: string
  description: string
  parentLabel?: string | null
  sourceChunks: ExtractedTopicSourceChunk[]
}

const TOPIC_TOOL: Anthropic.Tool = {
  name: 'record_topics',
  description:
    'Record the distinct, testable study topics found in the source material. ' +
    'Each topic must cite the chunks it was drawn from so users can trace the topic back to their notes.',
  input_schema: {
    type: 'object',
    properties: {
      topics: {
        type: 'array',
        description: '5–25 distinct, substantive topics. Skip generic labels like "Introduction" or "Summary".',
        items: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              description: 'Concise topic label, 2–6 words. Use the terminology from the source notes.',
            },
            description: {
              type: 'string',
              description: '1–2 sentence summary of what this topic covers, in plain language.',
            },
            parentLabel: {
              type: 'string',
              description:
                'Optional. The exact label of a more general topic in this same array that this topic is a sub-topic of. Omit if the topic is top-level.',
            },
            sourceChunks: {
              type: 'array',
              description: 'The chunks from the source notes that cover this topic. At least one entry required.',
              minItems: 1,
              items: {
                type: 'object',
                properties: {
                  documentId: { type: 'string' },
                  chunkIndex: { type: 'integer' },
                },
                required: ['documentId', 'chunkIndex'],
              },
            },
          },
          required: ['label', 'description', 'sourceChunks'],
        },
      },
    },
    required: ['topics'],
  },
}

/**
 * Format chunks for the model with stable [doc:<id> chunk:<i>] tags so it can
 * cite back. The model is instructed (via tool schema) to return those same
 * (documentId, chunkIndex) pairs.
 */
function formatChunksForPrompt(documents: ExtractDocumentInput[]): string {
  const sections: string[] = []
  for (const doc of documents) {
    sections.push(`=== DOCUMENT ${doc.id} :: ${doc.fileName} ===`)
    for (const chunk of doc.chunks) {
      sections.push(`[doc:${doc.id} chunk:${chunk.index}]\n${chunk.text}`)
    }
  }
  return sections.join('\n\n')
}

function trimDocuments(documents: ExtractDocumentInput[]): ExtractDocumentInput[] {
  const total = documents.reduce((sum, d) => sum + d.chunks.length, 0)
  if (total <= MAX_CHUNKS_PER_CALL) return documents

  // Proportional sampling per document. Keep at least 1 chunk per doc.
  const ratio = MAX_CHUNKS_PER_CALL / total
  return documents.map((doc) => {
    const target = Math.max(1, Math.floor(doc.chunks.length * ratio))
    if (doc.chunks.length <= target) return doc

    // Evenly-spaced sample
    const step = doc.chunks.length / target
    const sampled: DocumentChunk[] = []
    for (let i = 0; i < target; i++) {
      sampled.push(doc.chunks[Math.floor(i * step)])
    }
    return { ...doc, chunks: sampled }
  })
}

export async function extractTopics(documents: ExtractDocumentInput[]): Promise<ExtractedTopic[]> {
  const trimmed = trimDocuments(documents)
  if (trimmed.every((d) => d.chunks.length === 0)) return []

  const prompt = formatChunksForPrompt(trimmed)

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    tools: [TOPIC_TOOL],
    tool_choice: { type: 'tool', name: 'record_topics' },
    system:
      'You are a study topic extractor. Read the source material — chunks are tagged with [doc:<id> chunk:<i>] — ' +
      'and identify the distinct, testable topics it covers. Group related sub-concepts under a parent topic when ' +
      'a clear hierarchy exists (use parentLabel). Each topic must cite the chunks it was drawn from. ' +
      'Aim for 5–25 topics depending on breadth of material. Skip filler sections (introductions, summaries, ' +
      'tables of contents). Use specific terminology from the source — avoid generic labels.',
    messages: [
      {
        role: 'user',
        content:
          'Extract the distinct study topics from the source material below and record them via the record_topics tool.\n\n' +
          'SOURCE MATERIAL:\n\n' +
          prompt,
      },
    ],
  })

  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'record_topics') {
    throw new Error('Model did not return a record_topics tool call')
  }

  const input = toolUse.input as { topics?: unknown }
  if (!input || !Array.isArray(input.topics)) {
    throw new Error('record_topics call did not include a topics array')
  }

  // Build a chunk index for citation validation
  const chunkLookup = new Map<string, Map<number, DocumentChunk>>()
  for (const doc of trimmed) {
    const chunkMap = new Map<number, DocumentChunk>()
    for (const chunk of doc.chunks) {
      chunkMap.set(chunk.index, chunk)
    }
    chunkLookup.set(doc.id, chunkMap)
  }

  const topics: ExtractedTopic[] = []
  for (const raw of input.topics) {
    if (!raw || typeof raw !== 'object') continue
    const t = raw as Record<string, unknown>
    if (typeof t.label !== 'string' || !t.label.trim()) continue
    if (typeof t.description !== 'string') continue
    if (!Array.isArray(t.sourceChunks)) continue

    const sourceChunks: ExtractedTopicSourceChunk[] = []
    for (const cite of t.sourceChunks) {
      if (!cite || typeof cite !== 'object') continue
      const c = cite as Record<string, unknown>
      if (typeof c.documentId !== 'string') continue
      if (typeof c.chunkIndex !== 'number') continue

      const chunk = chunkLookup.get(c.documentId)?.get(c.chunkIndex)
      if (!chunk) continue
      sourceChunks.push({
        documentId: c.documentId,
        chunkIndex: c.chunkIndex,
        excerpt: chunk.text,
      })
    }

    // Drop topics whose every citation was hallucinated
    if (sourceChunks.length === 0) continue

    topics.push({
      label: t.label.trim(),
      description: t.description.trim(),
      parentLabel: typeof t.parentLabel === 'string' && t.parentLabel.trim() ? t.parentLabel.trim() : null,
      sourceChunks,
    })
  }

  return topics
}
