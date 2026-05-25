import type { CompactItem } from '../ebay/ebay.types.js'

const MAX_ITEMS_PER_MESSAGE = 5

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      default:  return '&#39;'
    }
  })
}

function fmtPrice(p: { value: string; currency: string }): string {
  const n = Number(p.value)
  if (!Number.isFinite(n)) return `${p.value} ${p.currency}`
  // Compact form for Telegram: no cents unless it changes the display
  return n >= 1000 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(2).replace(/\.00$/, '')}`
}

/**
 * Builds the per-poll Telegram batch message. One message regardless of
 * match count, capped at MAX_ITEMS_PER_MESSAGE inline with a "+N more" tail.
 */
export function formatBatchMessage(watchName: string, items: CompactItem[]): string {
  if (items.length === 0) return ''

  const total = items.length
  const shown = items.slice(0, MAX_ITEMS_PER_MESSAGE)

  const lines: string[] = [
    `🔔 <b>${htmlEscape(watchName)}</b> — ${total} new`,
    '',
  ]

  shown.forEach((item, idx) => {
    const url = item.affiliateUrl ?? item.webUrl
    const isAuction = item.buyingOptions.includes('AUCTION')
    const priceStr =
      isAuction && item.currentBidPrice
        ? `${fmtPrice(item.currentBidPrice)} bid`
        : fmtPrice(item.price)

    const meta: string[] = [priceStr]
    if (item.condition) meta.push(htmlEscape(item.condition))
    if (item.seller) {
      meta.push(`@${htmlEscape(item.seller.username)} (${htmlEscape(item.seller.feedbackPct)}%)`)
    } else if (item.itemLocation?.country) {
      meta.push(htmlEscape(item.itemLocation.country))
    }

    lines.push(`${idx + 1}. <a href="${htmlEscape(url)}">${htmlEscape(item.title)}</a>`)
    lines.push(`   ${meta.join(' · ')}`)
  })

  if (total > MAX_ITEMS_PER_MESSAGE) {
    lines.push('')
    lines.push(`<i>+ ${total - MAX_ITEMS_PER_MESSAGE} more in Axeous Collect</i>`)
  }

  return lines.join('\n')
}
