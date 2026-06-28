import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Stripe from 'stripe'

/**
 * One-shot Stripe provisioning for Axeous Pro. Creates the product, the three
 * prices (monthly / annual / lifetime), and a customer-portal configuration,
 * then writes the resulting price ids into server/.env.
 *
 * Idempotent: re-running reuses the existing product (by name) and prices (by
 * lookup_key) instead of creating duplicates. Test-mode only as a safety guard.
 *
 * Run: STRIPE_SECRET_KEY must be set in server/.env, then `npm run setup:stripe`.
 *
 * Amounts (in the smallest currency unit) and currency can be overridden via
 * env before running; defaults are shown below.
 */

const KEY = process.env.STRIPE_SECRET_KEY
if (!KEY) {
  console.error(
    'STRIPE_SECRET_KEY is not set in server/.env. Add your test secret key (sk_test_...) and re-run.'
  )
  process.exit(1)
}
if (!KEY.startsWith('sk_test_')) {
  console.error(
    'Refusing to run: STRIPE_SECRET_KEY must be a TEST key (sk_test_...). This script only provisions test mode.'
  )
  process.exit(1)
}

const stripe = new Stripe(KEY)

const PRODUCT_NAME = 'Axeous Pro'
const CURRENCY = (process.env.SETUP_PRICE_CURRENCY ?? 'usd').toLowerCase()
const MONTHLY_CENTS = Number(process.env.SETUP_PRICE_MONTHLY_CENTS ?? 1200) // $12.00/mo
const ANNUAL_CENTS = Number(process.env.SETUP_PRICE_ANNUAL_CENTS ?? 9900) // $99.00/yr
const LIFETIME_CENTS = Number(process.env.SETUP_PRICE_LIFETIME_CENTS ?? 19900) // $199.00 once

const LOOKUP = {
  monthly: 'axeous_pro_monthly',
  annual: 'axeous_pro_annual',
  lifetime: 'axeous_pro_lifetime',
} as const

async function ensureProduct(): Promise<string> {
  const found = await stripe.products
    .search({ query: `name:'${PRODUCT_NAME}' AND active:'true'` })
    .catch(() => null)
  if (found?.data[0]) return found.data[0].id
  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'Axeous Pro — higher AI limits, more custom plans, AI test generation.',
  })
  return product.id
}

async function ensurePrice(opts: {
  productId: string
  lookupKey: string
  amount: number
  recurring?: 'month' | 'year'
}): Promise<string> {
  const existing = await stripe.prices.list({
    lookup_keys: [opts.lookupKey],
    active: true,
    limit: 1,
  })
  if (existing.data[0]) return existing.data[0].id

  const price = await stripe.prices.create({
    product: opts.productId,
    currency: CURRENCY,
    unit_amount: opts.amount,
    lookup_key: opts.lookupKey,
    ...(opts.recurring ? { recurring: { interval: opts.recurring } } : {}),
  })
  return price.id
}

async function ensurePortalConfig(): Promise<void> {
  const list = await stripe.billingPortal.configurations.list({ limit: 1 })
  if (list.data[0]) return
  await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Axeous — manage your subscription' },
    features: {
      customer_update: { enabled: true, allowed_updates: ['email'] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true },
    },
  })
}

function upsertEnv(updates: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), '.env')
  let text = ''
  try {
    text = readFileSync(envPath, 'utf8')
  } catch {
    text = ''
  }
  const seen = new Set<string>()
  const out = text.split('\n').map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/)
    if (m && updates[m[1]] !== undefined) {
      seen.add(m[1])
      return `${m[1]}=${updates[m[1]]}`
    }
    return line
  })
  let result = out.join('\n')
  const missing = Object.keys(updates).filter((k) => !seen.has(k))
  if (missing.length) {
    if (result.length && !result.endsWith('\n')) result += '\n'
    result += missing.map((k) => `${k}=${updates[k]}`).join('\n') + '\n'
  }
  writeFileSync(envPath, result)
}

async function main(): Promise<void> {
  console.log('Provisioning Stripe (test mode)…\n')

  const productId = await ensureProduct()
  console.log(`Product:  ${productId}`)

  const monthly = await ensurePrice({
    productId,
    lookupKey: LOOKUP.monthly,
    amount: MONTHLY_CENTS,
    recurring: 'month',
  })
  const annual = await ensurePrice({
    productId,
    lookupKey: LOOKUP.annual,
    amount: ANNUAL_CENTS,
    recurring: 'year',
  })
  const lifetime = await ensurePrice({
    productId,
    lookupKey: LOOKUP.lifetime,
    amount: LIFETIME_CENTS,
  })
  console.log(`Monthly:  ${monthly}  (${(MONTHLY_CENTS / 100).toFixed(2)} ${CURRENCY}/mo)`)
  console.log(`Annual:   ${annual}  (${(ANNUAL_CENTS / 100).toFixed(2)} ${CURRENCY}/yr)`)
  console.log(`Lifetime: ${lifetime}  (${(LIFETIME_CENTS / 100).toFixed(2)} ${CURRENCY} once)`)

  await ensurePortalConfig()
  console.log('Portal:   configured')

  upsertEnv({
    STRIPE_PRICE_PRO_MONTHLY: monthly,
    STRIPE_PRICE_PRO_ANNUAL: annual,
    STRIPE_PRICE_PRO_LIFETIME: lifetime,
  })
  console.log('\nWrote price ids into server/.env.')
  console.log('\nLast steps (webhook):')
  console.log('  1. stripe listen --forward-to localhost:3001/api/billing/webhook')
  console.log('  2. Put the printed whsec_... into STRIPE_WEBHOOK_SECRET in server/.env')
  console.log('  3. Restart the server (npm run dev) so the new env loads.')
}

main().catch((err) => {
  console.error('\nSetup failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
