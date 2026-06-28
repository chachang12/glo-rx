import { Hono } from 'hono'
import type Stripe from 'stripe'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { stripe, PRICES, isStripeConfigured, type Cadence } from '../../lib/stripe.js'
import { TIER_CAPABILITIES } from '../../config/usage.js'
import { tierForUser, capabilitiesForUser } from '../shared/user/user.tier.js'
import { getOrCreateCustomer, handleStripeEvent } from './billing.service.js'
import { ProcessedStripeEventModel } from './processed-stripe-event.model.js'

const billingRoutes = new Hono<AuthEnv>()

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173'
const CADENCES: Cadence[] = ['monthly', 'annual', 'lifetime']

// ── Webhook (public, raw body) ───────────────────────────────────────────────
// Defined BEFORE requireAuth so it stays unauthenticated. Stripe signs the raw
// body, so we must read it verbatim (never c.req.json() here).
billingRoutes.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return c.json({ error: 'Webhook not configured' }, 400)
  }

  const raw = await c.req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch {
    return c.json({ error: 'Signature verification failed' }, 400)
  }

  // Idempotency: Stripe retries deliveries, so skip events we've recorded.
  const seen = await ProcessedStripeEventModel.findOne({ eventId: event.id }).lean()
  if (seen) return c.json({ received: true })

  try {
    await handleStripeEvent(event)
    await ProcessedStripeEventModel.create({ eventId: event.id, type: event.type })
  } catch (err) {
    // Return 500 so Stripe retries; handlers are idempotent.
    console.error('[billing] webhook handler error', err)
    return c.json({ error: 'Webhook handler failed' }, 500)
  }

  return c.json({ received: true })
})

// ── Authenticated routes ─────────────────────────────────────────────────────
billingRoutes.use(requireAuth)

// POST /api/billing/checkout — start a Checkout session for a cadence.
billingRoutes.post('/checkout', async (c) => {
  if (!isStripeConfigured) {
    return c.json({ error: 'Billing is not configured on this server.' }, 503)
  }

  const authUser = c.get('user')
  const body = (await c.req.json().catch(() => ({}))) as { cadence?: string }
  const cadence = body.cadence as Cadence

  if (!CADENCES.includes(cadence)) {
    return c.json({ error: 'Invalid cadence' }, 400)
  }
  const price = PRICES[cadence]
  if (!price) {
    return c.json({ error: `Pricing for ${cadence} is not configured yet.` }, 503)
  }

  try {
    const customer = await getOrCreateCustomer(authUser.id, authUser.email, authUser.name)
    const isSubscription = cadence !== 'lifetime'

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      customer,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: authUser.id,
      metadata: { authId: authUser.id, cadence },
      ...(isSubscription
        ? { subscription_data: { metadata: { authId: authUser.id, cadence } } }
        : {}),
      success_url: `${CLIENT_URL}/app/billing?status=success`,
      cancel_url: `${CLIENT_URL}/app/billing?status=cancel`,
    })

    return c.json({ url: session.url })
  } catch (err) {
    console.error('[billing] checkout error:', err instanceof Error ? err.message : err)
    return c.json({ error: 'Could not start checkout. Please try again.' }, 502)
  }
})

// POST /api/billing/portal — open the Stripe customer portal.
billingRoutes.post('/portal', async (c) => {
  if (!isStripeConfigured) {
    return c.json({ error: 'Billing is not configured on this server.' }, 503)
  }

  const authUser = c.get('user')
  try {
    const customer = await getOrCreateCustomer(authUser.id, authUser.email, authUser.name)
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${CLIENT_URL}/app/billing`,
    })
    return c.json({ url: session.url })
  } catch (err) {
    console.error('[billing] portal error:', err instanceof Error ? err.message : err)
    return c.json({ error: 'Could not open the billing portal. Please try again.' }, 502)
  }
})

// GET /api/billing/subscription — the caller's subscription + resolved capabilities.
billingRoutes.get('/subscription', async (c) => {
  const appUser = c.get('appUser')
  const sub = appUser.subscription
  return c.json({
    tier: tierForUser(appUser),
    status: sub?.status ?? 'none',
    cadence: sub?.cadence ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    capabilities: capabilitiesForUser(appUser),
    // Both tiers' matrices so the client renders the comparison from server
    // config rather than hardcoding the numbers (kept in sync with docs/licensing.md).
    tiers: TIER_CAPABILITIES,
  })
})

// GET /api/billing/prices — real Stripe amounts for each cadence, so the
// pricing UI never hardcodes dollar figures. Degrades to null when a price is
// unconfigured or Stripe is unreachable.
billingRoutes.get('/prices', async (c) => {
  const prices = await Promise.all(
    CADENCES.map(async (cadence) => {
      const id = PRICES[cadence]
      if (!id) return { cadence, amount: null, currency: null, interval: null }
      try {
        const price = await stripe.prices.retrieve(id)
        return {
          cadence,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? null,
        }
      } catch {
        return { cadence, amount: null, currency: null, interval: null }
      }
    })
  )
  return c.json({ prices })
})

export default billingRoutes
