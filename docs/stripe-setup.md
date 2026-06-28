# Stripe Setup Guide

How to configure Stripe so the Axeous Pro billing flow works end to end. Do the
whole guide in **test mode** first, then repeat the key/price/webhook steps with
live values when you go to production.

The integration is hand-rolled (the `stripe` SDK plus a signature-verified
webhook). The server reads five environment variables; until all are set,
`/api/billing/checkout` and `/api/billing/portal` return `503 Billing is not
configured` and the dashboard upgrade buttons will not work.

| Variable | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret API key (`sk_test_...` / `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint (`whsec_...`) |
| `STRIPE_PRICE_PRO_MONTHLY` | Price id for the monthly subscription (`price_...`) |
| `STRIPE_PRICE_PRO_ANNUAL` | Price id for the annual subscription (`price_...`) |
| `STRIPE_PRICE_PRO_LIFETIME` | Price id for the one-time lifetime purchase (`price_...`) |

---

## 1. Create a Stripe account and enable test mode

1. Sign up or sign in at https://dashboard.stripe.com/.
2. Toggle **Test mode** on (switch in the top-right of the dashboard). Every
   step below should be done with that toggle on — test data and live data are
   completely separate.

## 2. Get your secret key

1. Go to **Developers → API keys** (https://dashboard.stripe.com/test/apikeys).
2. Copy the **Secret key** (`sk_test_...`). Reveal it first; it is shown in full
   only once.

This is `STRIPE_SECRET_KEY`. (The publishable key is **not** needed — checkout is
hosted by Stripe and the browser is redirected to it.)

## 3. Create the "Axeous Pro" product and its three prices

The app sells one product with three purchase options (cadences). Create them in
**Product catalog → Add product** (https://dashboard.stripe.com/test/products):

1. **Name:** `Axeous Pro`.
2. Add three prices to that same product:

   | Price | Type | Billing period | Maps to |
   | --- | --- | --- | --- |
   | Monthly | Recurring | Monthly | `STRIPE_PRICE_PRO_MONTHLY` |
   | Annual | Recurring | Yearly | `STRIPE_PRICE_PRO_ANNUAL` |
   | Lifetime | One-time | — | `STRIPE_PRICE_PRO_LIFETIME` |

   Set whatever amounts you want (e.g. $12/mo, $99/yr, $249 once). The app reads
   the real amounts from Stripe and never hardcodes them, so you can change
   prices later without touching code.

3. After saving, open each price and copy its **API ID** (`price_...`). Each
   price has its own id — you need all three.

## 4. Put the values in `server/.env`

Add (or fill in) these lines in `server/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_PRICE_PRO_LIFETIME=price_xxx
# STRIPE_WEBHOOK_SECRET is added in step 6
```

> The server loads `.env` only at startup. If `npm run dev` is already running,
> **restart it** — `tsx watch` reloads on source changes but not on `.env`
> changes.

## 5. Activate the customer portal (one-time)

The "Manage subscription" button calls Stripe's billing portal, which must be
activated once per mode or the call fails.

1. Go to **Settings → Billing → Customer portal**
   (https://dashboard.stripe.com/test/settings/billing/portal).
2. Click **Activate** (the defaults are fine — allow customers to cancel and
   update payment methods).

## 6. Set up the webhook

Stripe tells the server when a payment succeeds or a subscription changes. The
server endpoint is `POST /api/billing/webhook`. It handles
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, and `customer.subscription.deleted`.

### Local development (Stripe CLI)

1. Install the CLI: https://docs.stripe.com/stripe-cli (macOS: `brew install stripe/stripe-cli/stripe`).
2. `stripe login`.
3. Forward events to your local server:

   ```bash
   stripe listen --forward-to localhost:3001/api/billing/webhook
   ```

4. The CLI prints a signing secret (`whsec_...`). Put it in `server/.env` as
   `STRIPE_WEBHOOK_SECRET` and **restart the server**.

   > The CLI's signing secret is different from the dashboard endpoint's secret
   > (step below). Use the CLI one for local dev.

Keep `stripe listen` running while you test.

### Production (dashboard endpoint)

1. Go to **Developers → Webhooks → Add endpoint**
   (https://dashboard.stripe.com/test/webhooks).
2. **Endpoint URL:** `https://<your-api-domain>/api/billing/webhook`
   (production is `https://api.axeous.com/api/billing/webhook`).
3. **Events to send** — select:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Save, then copy the endpoint's **Signing secret** (`whsec_...`) into the
   production environment as `STRIPE_WEBHOOK_SECRET` (on Render: the service's
   Environment settings).

## 7. Verify it works

With `npm run dev` running in both `server/` and `client/`, and `stripe listen`
running:

1. Open the app, go to **Profile → Subscription → Upgrade**, or visit
   `/app/billing`.
2. Choose a cadence. You should be redirected to Stripe Checkout.
3. Pay with the test card:
   - Number `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
4. You are redirected back to `/app/billing?status=success`. Within a moment the
   `stripe listen` terminal shows `checkout.session.completed`, and the page
   flips to **Pro** (the webhook is the source of truth).
5. Confirm the entitlement changed: your daily AI limit goes from 10 to 50, and
   the custom-plan limits rise (1 → 5 plans, 5 → 20 files).
6. Click **Manage subscription** — it should open the Stripe portal. Cancel
   there, and the page reverts to **Free** after the
   `customer.subscription.deleted` event.

Test each cadence (monthly, annual, lifetime). Lifetime uses a one-time payment
(no renewal); the others are subscriptions.

## 8. Going live

1. Turn **Test mode** off and repeat steps 2, 3, 5, and 6 with live values
   (live secret key, live prices, a live webhook endpoint pointing at the
   production URL).
2. Set the live `STRIPE_SECRET_KEY`, the three live `price_...` ids, and the
   live `STRIPE_WEBHOOK_SECRET` in the production environment (Render).
3. Complete one real purchase (or a $0 test) to confirm the production webhook
   delivers and entitlement updates.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Checkout returns `503 Billing is not configured` | `STRIPE_SECRET_KEY` not set | Add it to `.env`, restart the server |
| Checkout returns `503 Pricing for <cadence> is not configured` | That cadence's `price_...` id is missing | Add the price id, restart |
| Server log: `Invalid API Key provided: sk_uncon***ured` | Placeholder key in use (no real key) | Set `STRIPE_SECRET_KEY`, restart |
| Checkout returns `502 Could not start checkout` | Stripe rejected the request (bad/expired key, deleted price) | Check the server log line for the Stripe message |
| Portal errors about "no configuration" | Customer portal not activated | Do step 5 |
| Paid, but the page stays on Free | Webhook not received | Ensure `stripe listen` is running (local) or the endpoint + `STRIPE_WEBHOOK_SECRET` are set (prod); check the events in the dashboard |
| Webhook returns `400 Signature verification failed` | Wrong `STRIPE_WEBHOOK_SECRET` | Use the secret from the matching source (CLI vs dashboard endpoint), restart |

The policy these tiers enforce is documented in [licensing.md](./licensing.md).
