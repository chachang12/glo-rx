import Stripe from 'stripe'

/**
 * Stripe client singleton. Constructed even when the key is absent (with a
 * placeholder) so the rest of the server still boots in environments without
 * billing configured — actual API calls then fail with an auth error, and
 * `isStripeConfigured` lets startup emit a warning (mirrors the eBay/Telegram
 * optional-integration pattern).
 */
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY

export const isStripeConfigured = Boolean(STRIPE_SECRET)

export const stripe = new Stripe(STRIPE_SECRET || 'sk_unconfigured')

export type Cadence = 'monthly' | 'annual' | 'lifetime'

/** Maps a billing cadence to its configured Stripe Price id. */
export const PRICES: Record<Cadence, string> = {
  monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
  lifetime: process.env.STRIPE_PRICE_PRO_LIFETIME ?? '',
}

/** Reverse lookup: which cadence a Stripe Price id corresponds to (webhook use). */
export function cadenceForPriceId(priceId: string): Cadence | undefined {
  return (Object.keys(PRICES) as Cadence[]).find((c) => PRICES[c] && PRICES[c] === priceId)
}
