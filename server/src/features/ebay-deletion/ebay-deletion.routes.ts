import { Hono } from 'hono'
import { createHash } from 'node:crypto'

const ebayDeletionRoutes = new Hono()

ebayDeletionRoutes.get('/', (c) => {
  const challengeCode = c.req.query('challenge_code')
  const token = process.env.EBAY_VERIFICATION_TOKEN
  const endpoint = process.env.EBAY_DELETION_ENDPOINT_URL

  if (!challengeCode) return c.json({ error: 'missing challenge_code' }, 400)
  if (!token || !endpoint) {
    console.error('[ebay-deletion] missing EBAY_VERIFICATION_TOKEN or EBAY_DELETION_ENDPOINT_URL')
    return c.json({ error: 'server misconfigured' }, 500)
  }

  const challengeResponse = createHash('sha256')
    .update(challengeCode)
    .update(token)
    .update(endpoint)
    .digest('hex')

  return c.json({ challengeResponse }, 200)
})

ebayDeletionRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  // Axeous does not store eBay user data; log and ack so eBay marks the notification delivered.
  console.log('[ebay-deletion] notification received', JSON.stringify(body))
  return c.body(null, 200)
})

export default ebayDeletionRoutes
