import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { paths } from '@/config/paths'
import { userKeys } from '@/features/shared/user'
import {
  useGetSubscription,
  useGetPrices,
  useCreateCheckout,
  useCreatePortal,
  billingKeys,
  type Cadence,
  type Capabilities,
  type Price,
} from '@/features/shared/billing'
import './billing.css'

const CADENCE_META: Record<Cadence, { label: string; blurb: string }> = {
  monthly: { label: 'Monthly', blurb: 'Billed every month. Cancel anytime.' },
  annual: { label: 'Annual', blurb: 'Billed once a year.' },
  lifetime: { label: 'Lifetime', blurb: 'Pay once, keep Pro forever.' },
}

const CADENCE_ORDER: Cadence[] = ['monthly', 'annual', 'lifetime']

export const Billing = () => {
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const status = params.get('status')

  const { data: sub, isLoading } = useGetSubscription()
  const { data: pricesData } = useGetPrices()
  const checkout = useCreateCheckout()
  const portal = useCreatePortal()

  // The webhook is the source of truth; a success redirect just means we should
  // refetch so the UI reflects the new entitlement.
  useEffect(() => {
    if (status === 'success') {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    }
  }, [status, queryClient])

  const isPro = sub?.tier === 'pro'
  const priceFor = (cadence: Cadence): Price | undefined =>
    pricesData?.prices.find((p) => p.cadence === cadence)

  return (
    <div className="axeous-billing">
      <div className="wrap page-bottom">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to={paths.app.dashboard.getHref()}>← Back to dashboard</Link>
        </nav>
        <h1 className="page-title">Billing</h1>
        <p className="page-sub">Manage your Axeous Pro subscription</p>

        {status === 'success' && (
          <div className="billing-banner success" role="status">
            Payment received. Your Pro access is being activated — it may take a moment.
          </div>
        )}
        {status === 'cancel' && (
          <div className="billing-banner" role="status">
            Checkout canceled. No charge was made.
          </div>
        )}

        {/* CURRENT PLAN */}
        <div className="card current-plan">
          <div className="current-plan-main">
            <span className={`tier-badge ${isPro ? 'pro' : 'free'}`}>
              {isLoading ? '…' : isPro ? 'Pro' : 'Free'}
            </span>
            <div className="current-plan-info">
              <div className="current-plan-title">
                {isPro ? 'Axeous Pro' : 'Free plan'}
              </div>
              <div className="current-plan-sub">{describeStatus(sub)}</div>
            </div>
          </div>
          {isPro && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
            >
              {portal.isPending ? 'Opening…' : 'Manage subscription'}
            </button>
          )}
        </div>

        {/* UPGRADE OPTIONS (free only) */}
        {!isPro && (
          <>
            <h3 className="section-title">Upgrade to Pro</h3>
            <div className="plan-grid">
              {CADENCE_ORDER.map((cadence) => {
                const meta = CADENCE_META[cadence]
                const price = priceFor(cadence)
                const pending = checkout.isPending && checkout.variables === cadence
                return (
                  <div
                    key={cadence}
                    className={`card plan-card ${cadence === 'lifetime' ? 'featured' : ''}`}
                  >
                    <div className="plan-card-label">{meta.label}</div>
                    <div className="plan-card-price">{formatPrice(price)}</div>
                    <div className="plan-card-blurb">{meta.blurb}</div>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => checkout.mutate(cadence)}
                      disabled={checkout.isPending}
                    >
                      {pending ? 'Redirecting…' : 'Choose'}
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="plan-grid-note">
              One AI credit is one generation request (a batch of about ten items). You'll
              confirm the exact price securely on Stripe.
            </p>
          </>
        )}

        {/* COMPARISON */}
        {sub && (
          <>
            <h3 className="section-title">What's included</h3>
            <div className="card compare">
              <ComparisonRows free={sub.tiers.free} pro={sub.tiers.pro} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ComparisonRows({ free, pro }: { free: Capabilities; pro: Capabilities }) {
  const rows: { label: string; free: string; pro: string }[] = [
    {
      label: 'AI credits per day',
      free: String(free.dailyAiCalls),
      pro: String(pro.dailyAiCalls),
    },
    {
      label: 'Custom study plans',
      free: String(free.maxCustomPlans),
      pro: String(pro.maxCustomPlans),
    },
    {
      label: 'Files per custom plan',
      free: String(free.maxFilesPerPlan),
      pro: String(pro.maxFilesPerPlan),
    },
    {
      label: 'AI test generation',
      free: free.canGenerateTests ? 'Yes' : '—',
      pro: pro.canGenerateTests ? 'Yes' : '—',
    },
  ]
  return (
    <>
      <div className="compare-row compare-head">
        <div className="compare-cell label">Capability</div>
        <div className="compare-cell">Free</div>
        <div className="compare-cell pro">Pro</div>
      </div>
      {rows.map((r) => (
        <div className="compare-row" key={r.label}>
          <div className="compare-cell label">{r.label}</div>
          <div className="compare-cell">{r.free}</div>
          <div className="compare-cell pro">{r.pro}</div>
        </div>
      ))}
    </>
  )
}

// ============================================================
// Helpers
// ============================================================

function describeStatus(
  sub: ReturnType<typeof useGetSubscription>['data']
): string {
  if (!sub) return 'Loading…'
  if (sub.tier !== 'pro') {
    return 'Upgrade to lift your daily AI limit and unlock more.'
  }
  if (sub.cadence === 'lifetime') return 'Lifetime access — no renewal.'
  const ends = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null
  if (sub.status === 'past_due') {
    return 'Payment past due — update your payment method to keep Pro.'
  }
  if (sub.cancelAtPeriodEnd && ends) return `Cancels on ${ends}.`
  if (ends) return `Renews on ${ends}.`
  return 'Active.'
}

function formatPrice(price: Price | undefined): string {
  if (!price || price.amount == null || !price.currency) return 'See price at checkout'
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: price.currency.toUpperCase(),
  }).format(price.amount / 100)
  if (!price.interval) return formatted
  return `${formatted}/${price.interval}`
}
