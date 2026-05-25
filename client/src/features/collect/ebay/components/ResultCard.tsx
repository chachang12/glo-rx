import type { CompactItem } from '../types/ebay.schema'

interface Props {
  item: CompactItem
  highlight?: boolean
}

function formatPrice(p: { value: string; currency: string }): string {
  const n = Number(p.value)
  if (!Number.isFinite(n)) return `${p.value} ${p.currency}`
  return `$${n.toFixed(2)}`
}

function relativeTime(iso: string | null): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  const seconds = Math.max(1, Math.round((Date.now() - t) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

export function ResultCard({ item, highlight }: Props) {
  const url = item.affiliateUrl ?? item.webUrl
  const listed = relativeTime(item.itemOriginDate)
  const isAuction = item.buyingOptions.includes('AUCTION')
  const displayPrice = isAuction && item.currentBidPrice
    ? formatPrice(item.currentBidPrice)
    : formatPrice(item.price)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`flex gap-4 rounded-lg border p-3 transition-colors ${
        highlight
          ? 'border-brand-teal/40 bg-glass-strong'
          : 'border-line bg-glass hover:border-line-strong hover:bg-glass-strong'
      }`}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-2">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
            No image
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="line-clamp-2 text-sm font-medium text-ink">{item.title}</div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-base font-semibold text-ink">{displayPrice}</span>
          {isAuction && item.bidCount !== null && (
            <span className="text-xs text-ink-dim">{item.bidCount} bid{item.bidCount === 1 ? '' : 's'}</span>
          )}
          {item.shippingCost && Number(item.shippingCost.value) === 0 && (
            <span className="text-xs text-brand-teal">Free shipping</span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-faint">
          {item.condition && <span>{item.condition}</span>}
          {item.seller && <span>@{item.seller.username} · {item.seller.feedbackPct}%</span>}
          {item.itemLocation && <span>{[item.itemLocation.city, item.itemLocation.country].filter(Boolean).join(', ')}</span>}
          {listed && <span>{listed}</span>}
          {!item.affiliateUrl && <span className="text-brand-coral/70">no affiliate</span>}
        </div>
      </div>
    </a>
  )
}
