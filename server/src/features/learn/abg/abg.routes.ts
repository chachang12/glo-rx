import { Hono } from 'hono'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../../middleware/auth.js'
import { requireLicense } from '../../../middleware/license.js'
import { requireUsage } from '../../../middleware/usage.js'
import type { AuthEnv } from '../../../types.js'

const abgRoutes = new Hono<AuthEnv>()

abgRoutes.use(requireAuth)
const anthropic = new Anthropic() // reads ANTHROPIC_API_KEY from env

// The ABG driller is exam-agnostic (no examCode in the request), so requireUsage
// counts each vignette against the caller's most recent plan. Like the other AI
// endpoints, it's gated by license + daily usage quota.
abgRoutes.post('/vignette', requireLicense('aiGeneration'), requireUsage, async (c) => {
  const { values, imbalance, compensation } = c.get('parsedBody') as {
    values: { pH: number; PaCO2: number; HCO3: number; PaO2: number }
    imbalance: string
    compensation: string
  }

  const prompt = `Generate a 2-sentence clinical vignette for an NCLEX-style ABG interpretation question.
The ABG values are: pH ${values.pH}, PaCO2 ${values.PaCO2} mmHg, HCO3 ${values.HCO3} mEq/L, PaO2 ${values.PaO2} mmHg.
The correct interpretation is: ${imbalance}, ${compensation}.
The vignette should describe a realistic patient scenario that is consistent with this diagnosis (e.g. a COPD patient for respiratory acidosis, a patient who has been vomiting for metabolic alkalosis).
Do NOT name the diagnosis in the vignette. Start with "A nurse is caring for...".
Return only the vignette text, no quotes, no labels.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  const vignette =
    message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  return c.json({ vignette })
})

export default abgRoutes
