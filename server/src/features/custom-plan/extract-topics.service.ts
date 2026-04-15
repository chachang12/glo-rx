import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024
const MAX_INPUT_CHARS = 32_000 // ~8k tokens at ~4 chars/token

const anthropic = new Anthropic()

/**
 * If the combined text exceeds MAX_INPUT_CHARS, proportionally sample it:
 * - First 10,000 chars (opening context)
 * - Last 5,000 chars (closing context)
 * - Evenly-spaced 1,000-char excerpts from the middle
 */
function sampleText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text

  const HEAD = 10_000
  const TAIL = 5_000
  const EXCERPT_SIZE = 1_000
  const budget = MAX_INPUT_CHARS - HEAD - TAIL
  const excerptCount = Math.floor(budget / EXCERPT_SIZE)

  const head = text.slice(0, HEAD)
  const tail = text.slice(-TAIL)

  const middleStart = HEAD
  const middleEnd = text.length - TAIL
  const middleLen = middleEnd - middleStart

  const excerpts: string[] = []
  for (let i = 0; i < excerptCount; i++) {
    const pos = middleStart + Math.floor((i / excerptCount) * middleLen)
    excerpts.push(text.slice(pos, pos + EXCERPT_SIZE))
  }

  return [head, '...', ...excerpts, '...', tail].join('\n\n')
}

export async function extractTopics(texts: string[]): Promise<string[]> {
  const combined = texts.join('\n\n---\n\n')
  const sampled = sampleText(combined)

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      'You are a study topic extractor. Given study material text, identify the distinct, testable topics covered. ' +
      'Return ONLY a JSON array of topic label strings. Each label should be concise (2-6 words). ' +
      'Aim for 5-20 topics depending on material breadth. ' +
      'Do not include generic labels like "Introduction", "Conclusion", or "Summary". ' +
      'Focus on substantive, testable concepts that a student would need to master.',
    messages: [
      {
        role: 'user',
        content:
          'Extract the distinct study topics from the following material. ' +
          'Return only a JSON array of topic label strings.\n\n' +
          sampled,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from Claude')
  }

  // Parse JSON — handle potential markdown code fences
  let jsonStr = content.text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const topics = JSON.parse(jsonStr)
  if (!Array.isArray(topics) || !topics.every((t) => typeof t === 'string')) {
    throw new Error('Invalid topics response — expected string array')
  }

  return topics
}
