import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import { requireUsage } from '../../middleware/usage.js'
import { requireLicense } from '../../middleware/license.js'
import type { AuthEnv } from '../../types.js'
import { generateFlashcards } from './flashcard.service.js'

const flashcardRoutes = new Hono<AuthEnv>()

flashcardRoutes.use(requireAuth)

// POST /api/flashcards/generate
// Body: { text, examCode, format? }
// Gated by auth + license + usage limits
flashcardRoutes.post('/generate', requireLicense('aiGeneration'), requireUsage, async (c) => {
  const body = c.get('parsedBody') as {
    text?: string
    examCode?: string
    format?: 'remnote' | 'anki'
  }

  if (!body.text?.trim()) {
    return c.json({ error: 'text is required' }, 400)
  }

  if (!body.examCode) {
    return c.json({ error: 'examCode is required' }, 400)
  }

  try {
    const result = await generateFlashcards({
      text: body.text,
      examCode: body.examCode,
      format: body.format,
    })

    return c.json(result)
  } catch (err) {
    console.error('Flashcard generation error:', err)
    return c.json({ error: 'Failed to generate flashcards' }, 500)
  }
})

export default flashcardRoutes
