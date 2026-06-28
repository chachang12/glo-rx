import Stripe from 'stripe'
import { stripe, cadenceForPriceId, type Cadence } from '../../lib/stripe.js'
import { UserModel } from '../shared/user/user.model.js'

/**
 * Billing domain logic. Stripe is the system of record for payment; the user's
 * `subscription` sub-document is the system of record for entitlement (tier and
 * capabilities derive from it via user.tier.ts). These functions translate
 * Stripe events into entitlement writes. All writes are single-document `$set`
 * updates, so they are atomic and safe to replay (idempotent webhooks).
 */

// ── Customer resolution ──────────────────────────────────────────────────────

/** Returns the user's Stripe customer id, creating + persisting one if needed. */
export async function getOrCreateCustomer(
  authId: string,
  email: string,
  name?: string
): Promise<string> {
  const user = await UserModel.findOne({ authId }).select('subscription.stripeCustomerId').lean()
  const existing = user?.subscription?.stripeCustomerId
  if (existing) return existing

  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { authId },
  })
  await UserModel.updateOne(
    { authId },
    { $set: { 'subscription.stripeCustomerId': customer.id } }
  )
  return customer.id
}

// ── Entitlement writes ───────────────────────────────────────────────────────

/** Marks a user Pro after a completed checkout (subscription or lifetime). */
async function grantPro(params: {
  authId: string
  cadence: Cadence
  stripeSubscriptionId?: string | null
  currentPeriodEnd?: Date | null
}): Promise<void> {
  await UserModel.updateOne(
    { authId: params.authId },
    {
      $set: {
        'subscription.status': 'active',
        'subscription.cadence': params.cadence,
        'subscription.stripeSubscriptionId': params.stripeSubscriptionId ?? null,
        'subscription.currentPeriodEnd': params.currentPeriodEnd ?? null,
        'subscription.cancelAtPeriodEnd': false,
      },
    }
  )
}

/** Syncs subscription status/period/cadence from a Stripe subscription object. */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const priceId = sub.items?.data?.[0]?.price?.id
  const cadence = priceId ? cadenceForPriceId(priceId) : undefined

  const set: Record<string, unknown> = {
    'subscription.status': mapStatus(sub.status),
    'subscription.stripeSubscriptionId': sub.id,
    'subscription.currentPeriodEnd': periodEnd(sub),
    'subscription.cancelAtPeriodEnd': sub.cancel_at_period_end ?? false,
  }
  if (cadence) set['subscription.cadence'] = cadence

  await UserModel.updateOne(
    { 'subscription.stripeCustomerId': customerIdOf(sub.customer) },
    { $set: set }
  )
}

/** Reverts a user to free when their subscription ends. */
async function revokePro(sub: Stripe.Subscription): Promise<void> {
  await UserModel.updateOne(
    { 'subscription.stripeCustomerId': customerIdOf(sub.customer) },
    { $set: { 'subscription.status': 'canceled', 'subscription.cancelAtPeriodEnd': false } }
  )
}

// ── Webhook dispatch ─────────────────────────────────────────────────────────

/** Routes a verified Stripe event to the right entitlement write. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await revokePro(event.data.object as Stripe.Subscription)
      break
    default:
      // Unhandled event types are acknowledged but ignored.
      break
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const authId =
    session.metadata?.authId ??
    (typeof session.client_reference_id === 'string' ? session.client_reference_id : null)
  if (!authId) return

  // Cadence comes from the metadata we set at checkout creation; fall back to
  // mode (payment ⇒ lifetime) for safety.
  const cadence =
    (session.metadata?.cadence as Cadence | undefined) ??
    (session.mode === 'payment' ? 'lifetime' : 'monthly')

  // For subscriptions the period end arrives via the subscription.* events that
  // follow; lifetime has no period end.
  await grantPro({
    authId,
    cadence,
    stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
    currentPeriodEnd: null,
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string {
  return typeof customer === 'string' ? customer : customer.id
}

function mapStatus(
  status: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'none' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'none'
  }
}

/**
 * The current period end. Stripe has been migrating this field from the
 * subscription onto its items, so read the item first and fall back to the
 * subscription for compatibility across API versions.
 */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined
  const ts =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end
  return ts ? new Date(ts * 1000) : null
}
