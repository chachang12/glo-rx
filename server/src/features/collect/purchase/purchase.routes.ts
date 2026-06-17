import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import { requireAdmin } from '../../../middleware/admin.js'
import type { AuthEnv } from '../../../types.js'
import { PurchaseModel } from './purchase.model.js'
import { ADMIN_LIST_HARD_CAP, KNOWN_ITEMS_DEFAULT_DAYS } from '../../../config/limits.js'

interface MaybeCompactItem {
  itemId?: unknown
  title?: unknown
  price?: { value?: unknown; currency?: unknown }
  currentBidPrice?: { value?: unknown; currency?: unknown } | null
  buyingOptions?: unknown
  webUrl?: unknown
  affiliateUrl?: unknown
}

const purchaseRoutes = new Hono<AuthEnv>()

purchaseRoutes.use(requireAuth)

// ── POST / ── mark item as purchased
purchaseRoutes.post('/', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') return c.json({ error: 'invalid body' }, 400)

  const item = (body as { item?: MaybeCompactItem }).item
  if (!item || typeof item !== 'object' || typeof item.itemId !== 'string') {
    return c.json({ error: 'item with itemId required' }, 400)
  }

  const isAuction =
    Array.isArray(item.buyingOptions) && (item.buyingOptions as unknown[]).includes('AUCTION')
  const rawPrice =
    isAuction && item.currentBidPrice && typeof item.currentBidPrice === 'object'
      ? item.currentBidPrice
      : item.price
  if (
    !rawPrice ||
    typeof rawPrice.value !== 'string' ||
    typeof rawPrice.currency !== 'string'
  ) {
    return c.json({ error: 'item.price.value and currency required' }, 400)
  }

  const watchIdRaw = (body as { watchId?: unknown }).watchId
  const watchNameRaw = (body as { watchName?: unknown }).watchName

  try {
    const purchase = await PurchaseModel.create({
      authId: authUser.id,
      authName: authUser.name ?? '',
      authEmail: authUser.email ?? '',
      watchId: typeof watchIdRaw === 'string' ? watchIdRaw : null,
      watchName: typeof watchNameRaw === 'string' ? watchNameRaw : null,
      itemId: item.itemId,
      item,
      pricePaid: { value: rawPrice.value, currency: rawPrice.currency },
    })
    return c.json(purchaseToDTO(purchase), 201)
  } catch (err) {
    const code = (err as { code?: number }).code
    if (code === 11000) {
      return c.json({ error: 'You already marked this item as purchased.' }, 409)
    }
    throw err
  }
})

// ── GET / ── admin only, optionally filtered by YYYY-MM-DD
purchaseRoutes.get('/', requireAdmin, async (c) => {
  const date = c.req.query('date')
  const filter: Record<string, unknown> = {}
  if (date) {
    const range = dayRangeUtc(date)
    if (!range) return c.json({ error: 'date must be YYYY-MM-DD' }, 400)
    filter.purchasedAt = { $gte: range.start, $lt: range.end }
  }

  const purchases = await PurchaseModel.find(filter)
    .sort({ purchasedAt: -1 })
    .limit(ADMIN_LIST_HARD_CAP)
    .lean()
  return c.json(purchases.map(purchaseLeanToDTO))
})

// ── GET /known-items ── any user; returns distinct itemIds from recent
// purchases so operator-facing watch views can dim items already on the
// global ledger and prevent accidental double-marks.

purchaseRoutes.get('/known-items', async (c) => {
  const since = c.req.query('since')
  let sinceDate: Date
  if (since) {
    const range = dayRangeUtc(since)
    if (!range) return c.json({ error: 'date must be YYYY-MM-DD' }, 400)
    sinceDate = range.start
  } else {
    sinceDate = new Date(Date.now() - KNOWN_ITEMS_DEFAULT_DAYS * 86_400_000)
  }

  const itemIds = await PurchaseModel.distinct('itemId', {
    purchasedAt: { $gte: sinceDate },
  })

  return c.json({
    since: sinceDate.toISOString(),
    itemIds,
  })
})

// ── DELETE /:id ── admin only, remove a single purchase from the ledger
purchaseRoutes.delete('/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const result = await PurchaseModel.findByIdAndDelete(id).lean()
  if (!result) return c.json({ error: 'not found' }, 404)
  return c.json({ id, deleted: true as const })
})

// ── GET /export.csv ── admin only, day-scoped CSV download
purchaseRoutes.get('/export.csv', requireAdmin, async (c) => {
  const date = c.req.query('date')
  if (!date) return c.json({ error: 'date query param required' }, 400)
  const range = dayRangeUtc(date)
  if (!range) return c.json({ error: 'date must be YYYY-MM-DD' }, 400)

  const purchases = await PurchaseModel.find({
    purchasedAt: { $gte: range.start, $lt: range.end },
  })
    .sort({ purchasedAt: 1 })
    .lean()

  let total = 0
  for (const p of purchases) {
    const n = Number(p.pricePaid.value)
    if (Number.isFinite(n)) total += n
  }

  const lines: string[] = []
  lines.push('Summary,,,,,,')
  lines.push(`Date,${csvCell(date)},,,,,`)
  lines.push(`Items purchased,${purchases.length},,,,,`)
  lines.push(`Total spent,${csvCell(formatUsd(total))},,,,,`)
  lines.push(',,,,,,')
  lines.push('Operator,Email,Item,Price,Watch,URL,Purchased At')
  for (const p of purchases) {
    const item = p.item as { title?: string; affiliateUrl?: string | null; webUrl?: string } | undefined
    const url = item?.affiliateUrl ?? item?.webUrl ?? ''
    lines.push(
      [
        csvCell(p.authName ?? ''),
        csvCell(p.authEmail ?? ''),
        csvCell(item?.title ?? ''),
        csvCell(formatPrice(p.pricePaid)),
        csvCell(p.watchName ?? ''),
        csvCell(url),
        csvCell(p.purchasedAt.toISOString()),
      ].join(',')
    )
  }

  const csv = lines.join('\n') + '\n'
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="purchases-${date}.csv"`)
  return c.body(csv)
})

// ── helpers ──────────────────────────────────────────────────────────────

function dayRangeUtc(dateStr: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return null
  const end = new Date(start.getTime() + 86_400_000)
  return { start, end }
}

function csvCell(value: string): string {
  if (/[,"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function formatPrice(p: { value: string; currency: string }): string {
  const n = Number(p.value)
  if (!Number.isFinite(n)) return `${p.value} ${p.currency}`
  return `$${n.toFixed(2)}`
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function purchaseToDTO(p: InstanceType<typeof PurchaseModel>) {
  return {
    id: String(p._id),
    authId: p.authId,
    authName: p.authName,
    authEmail: p.authEmail,
    watchId: p.watchId ? String(p.watchId) : null,
    watchName: p.watchName,
    itemId: p.itemId,
    item: p.item,
    pricePaid: p.pricePaid,
    purchasedAt: p.purchasedAt,
    notes: p.notes,
    createdAt: (p as { createdAt?: Date }).createdAt ?? null,
  }
}

type LeanPurchase = {
  _id: unknown
  authId: string
  authName: string
  authEmail: string
  watchId?: unknown
  watchName?: string | null
  itemId: string
  item: unknown
  pricePaid: { value: string; currency: string }
  purchasedAt: Date
  notes?: string | null
  createdAt?: Date
}

function purchaseLeanToDTO(p: LeanPurchase) {
  return {
    id: String(p._id),
    authId: p.authId,
    authName: p.authName,
    authEmail: p.authEmail,
    watchId: p.watchId ? String(p.watchId) : null,
    watchName: p.watchName ?? null,
    itemId: p.itemId,
    item: p.item,
    pricePaid: p.pricePaid,
    purchasedAt: p.purchasedAt,
    notes: p.notes ?? null,
    createdAt: p.createdAt ?? null,
  }
}

export default purchaseRoutes
