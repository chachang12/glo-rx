# Axeous Collect — eBay Browse API Integration

Design doc for adding the eBay Browse API client and live-listing dashboard
to the existing `collect` product partition. Adapted from a generic handoff
to this repo's conventions (Hono + `features/<domain>/<feature>` layout,
Better Auth, TanStack Query + Zod on the client, design tokens per CLAUDE.md).

## 1. Goal & non-goals

Build a server-side eBay Browse client inside the existing `collect` feature
partition and a live-feed dashboard inside the protected `/app/collect`
shell. Filters in, paginated search out — plus an SSE channel that streams
**new** listings as they appear on eBay.

### In scope (v1)

- `server/src/features/collect/ebay/` module — auth, filter serialization,
  Browse search, aspect discovery
- `GET /api/collect/ebay/search` (one-shot) and `GET /api/collect/ebay/watch`
  (SSE)
- `client/src/features/collect/ebay/` — Zod schemas, query hooks, a
  `useEbayWatch` SSE hook
- Replace the placeholder at `/app/collect/dashboard` with a real Browse +
  Watch UI
- Affiliate URL plumbed end-to-end (EPN header on every request)

### Out of scope (defer)

- Mongoose persistence of watches/listings (session-scoped, in-memory)
- Multi-tenancy, per-user quota tracking, notification channels
- Marketplace Insights, image search, marketplaces beyond US
- Changes to the public `/collect` marketing landing page

## 2. How this maps onto the existing codebase

| Concern | Handoff says | This repo's pattern |
|---|---|---|
| Module layout | `src/ebay/auth.ts`, `src/routes/search.ts` | `server/src/features/collect/ebay/ebay.routes.ts` + sibling files; `index.ts` re-exports `ebayRoutes` |
| Route prefix | `/api/ebay/*` | `/api/collect/ebay/*` — mount on the existing `collectRoutes` Hono instance (already at `/api/collect`) |
| Auth | "single-tenant, no accounts" | **Confirmed: wrap with `requireAuth`** from `middleware/auth.js`. `/app/collect` is already protected, and gating the API gives us a stable identity for the concurrent-watch cap |
| HTTP client (FE) | raw `fetch` / `EventSource` | `apiClient` (Zod-validated, `credentials: 'include'`) for search; native `EventSource` for watch (cookies flow automatically) |
| Persistence | Mongo skipped | Skipped — module-level `Map<connectionId, WatchState>` |
| Server SSE | Hono `hono/streaming` | Same — Hono is already on `^4.7.11` |
| Existing collect routes | n/a | `ebay-deletion.routes.ts` already lives at `server/src/features/collect/ebay-deletion/` — mirror that shape for the new `ebay/` sibling |
| Public `/collect` landing | n/a | **Confirmed: untouched in this iteration.** Stays as the "coming soon" marketing page |

## 3. Environment variables

Add to Render + `.env.local`. Existing `EBAY_VERIFICATION_TOKEN` and
`EBAY_DELETION_ENDPOINT_URL` (used by the deletion-notification route) stay.

```bash
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_MARKETPLACE_ID=EBAY_US
EBAY_EPN_CAMPAIGN_ID=          # 10-digit, from EPN
EBAY_EPN_REFERENCE_ID=axeous-collect
EBAY_USER_COUNTRY=US
EBAY_USER_ZIP=37402
EBAY_API_BASE=https://api.ebay.com
WATCH_POLL_INTERVAL_MS=60000   # 60s default, 30s only for dev
WATCH_MAX_CONCURRENT=3         # hard cap to protect 5k/day quota
```

A startup check in `server/src/index.ts` should log + warn if `EBAY_APP_ID`
/ `EBAY_CERT_ID` are missing, but not crash — the deletion endpoint is the
only required eBay path today, so we keep boot resilient.

## 4. Server module layout

```
server/src/features/collect/
├── ebay-deletion/                 # existing — untouched
│   ├── ebay-deletion.routes.ts
│   └── index.ts
├── ebay/                          # NEW
│   ├── ebay.auth.ts               # OAuth client-credentials token cache
│   ├── ebay.filters.ts            # SearchFilters → query params
│   ├── ebay.client.ts             # searchItems() + aspect discovery
│   ├── ebay.watch.ts              # in-memory watch registry + poll loop
│   ├── ebay.routes.ts             # /search, /watch (SSE), /aspects, /quota
│   ├── ebay.types.ts              # SearchFilters, ItemSummary, SearchResult
│   └── index.ts                   # re-exports `ebayRoutes`
└── index.ts                       # mount `ebayRoutes` onto `collectRoutes`
```

Mounting (in `collect/index.ts`):

```ts
import { Hono } from 'hono'
import type { AuthEnv } from '../../types.js'
import { ebayRoutes } from './ebay/index.js'

export const collectRoutes = new Hono<AuthEnv>()
collectRoutes.get('/health', (c) => c.json({ status: 'ok', product: 'collect' }))
collectRoutes.route('/ebay', ebayRoutes)
```

`server/src/index.ts` does not need to change — `/api/collect` is already
mounted.

### `ebay.auth.ts`

Single export `getAccessToken(): Promise<string>`. Module-level
`cachedToken: { token; expiresAt } | null`; single-flight via a
`pendingFetch: Promise<string> | null`. Refresh when
`Date.now() > expiresAt - 5*60*1000`. `POST /identity/v1/oauth2/token` with
`Authorization: Basic base64(APP_ID:CERT_ID)`, scope
`https://api.ebay.com/oauth/api_scope`.

### `ebay.filters.ts`

```ts
export interface SearchFilters {
  q?: string
  categoryId?: string
  priceMin?: number; priceMax?: number; priceCurrency?: string
  conditions?: ('NEW' | 'USED' | 'UNSPECIFIED')[]
  conditionIds?: string[]
  buyingOptions?: ('FIXED_PRICE' | 'AUCTION' | 'BEST_OFFER')[]
  sellers?: string[]; excludeSellers?: string[]
  itemLocationCountry?: string
  maxDeliveryCost?: 0
  returnsAccepted?: boolean
  searchInDescription?: boolean
  aspects?: Record<string, string[]>
  sort?: 'newlyListed' | 'endingSoonest' | 'price' | '-price'
  limit?: number; offset?: number
}

export function buildQueryParams(
  f: SearchFilters,
  opts?: { sinceISO?: string; fieldgroups?: string[] }
): URLSearchParams
```

Pure module, no I/O. Unit-test punctuation: `price:[10..100]`,
`conditions:{NEW|USED}`, aspect_filter requires the `categoryId:` prefix
matching `category_ids`.

### `ebay.client.ts`

```ts
export async function searchItems(
  filters: SearchFilters,
  opts?: { sinceISO?: string; aspectRefinements?: boolean }
): Promise<SearchResult>
```

- Calls `GET /buy/browse/v1/item_summary/search` with
  `Authorization: Bearer`, `X-EBAY-C-MARKETPLACE-ID`, and
  `X-EBAY-C-ENDUSERCTX: affiliateCampaignId=...,affiliateReferenceId=...,contextualLocation=country=...,zip=...`
- **Verify `itemAffiliateWebUrl` is populated on the first integration
  test.** If missing, the header is wrong.
- Returns a compact `ItemSummary` shape (strip what the UI doesn't need) —
  see §6.
- 30-second in-memory LRU on the `q + filters` key for one-shot searches
  to absorb pagination clicks. **Cache is bypassed whenever `sinceISO` is
  present** (i.e., watch-poller traffic always hits eBay).
- Aspect-discovery responses are cached per `categoryId` for ~1 hour in a
  separate module-level map to keep dropdown population off the quota hot
  path.

### `ebay.watch.ts`

Module-level state:

```ts
const watches = new Map<string, {
  authId: string
  filters: SearchFilters
  seen: Set<string>
  startTime: Date
  pollCount: number
  controller: AbortController
}>()
let dailyCalls = { count: 0, resetAt: nextUtcMidnight() }
```

Exports `startWatch(authId, filters, send): { watchId, stop }` where `send`
is a typed event emitter handed in by the SSE route. Poll loop runs every
`WATCH_POLL_INTERVAL_MS`:

1. Bail if `dailyCalls.count >= 0.9 * 5000` — emit `rate_limit` and break.
2. `searchItems(filters, { sinceISO })` with `sort=newlyListed&limit=50`.
3. For each item not in `seen`: add, `send('item', compactItem)`.
4. `sinceISO = max(itemOriginDate) - 60s` (overlap buffer).
5. `send('heartbeat', { pollCount, lastPollAt, newItemsInPoll })`.

On `controller.signal.aborted` (client disconnect): break, delete from
`watches`. GC handles the rest.

### `ebay.routes.ts` — endpoints

All routes `requireAuth`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/search` | One-shot Browse search, returns `SearchResult`. Filters as query params (URLSearchParams-serialized; `aspects` as JSON-encoded string for compactness) |
| `GET` | `/aspects` | Discovery: `?categoryId=&q=` → returns `aspectDistributions` |
| `GET` | `/watch` | SSE stream — see §5 |
| `GET` | `/quota` | Local counter + (best-effort) eBay Analytics `getRateLimits` |

Reject `/watch` with 429 if `watches.size >= WATCH_MAX_CONCURRENT`.

## 5. SSE protocol

Built on `hono/streaming`'s `streamSSE`. Reuse the contract verbatim from
the handoff:

| Event | Data | When |
|---|---|---|
| `connected` | `{ watchId, startTime, filters }` | On open |
| `item` | `CompactItem` (see §6) | New itemId observed |
| `heartbeat` | `{ pollCount, lastPollAt, newItemsInPoll }` | After each poll — also keeps proxies from killing the connection |
| `rate_limit` | `{ remaining, resetAt }` | When daily counter is at ≥90% |
| `error` | `{ message, fatal }` | On API failure; `fatal=true` for 401/403 |

`req.signal` (Hono exposes it on `c.req.raw.signal`) drives shutdown. No
keep-alive timer needed beyond the heartbeat.

## 6. Compact `ItemSummary` returned to the client

Strip the verbose Browse response down to what the UI actually renders.
Mirror this both as a server-side projection in `ebay.client.ts` and a Zod
schema on the client.

```ts
{
  itemId: string
  legacyItemId: string
  title: string
  affiliateUrl: string        // itemAffiliateWebUrl — required for monetization
  webUrl: string              // itemWebUrl (fallback if affiliateUrl missing)
  price: { value: string; currency: string }
  condition: string | null
  conditionId: string | null
  imageUrl: string | null
  thumbnails: string[]
  seller: { username: string; feedbackPct: string; feedbackScore: number } | null
  itemLocation: { country: string; postalCode: string; city: string | null } | null
  buyingOptions: string[]
  currentBidPrice: { value: string; currency: string } | null
  bidCount: number | null
  shippingCost: { value: string; currency: string } | null
  category: { id: string; name: string } | null
  itemOriginDate: string      // ISO
  itemEndDate: string | null
  marketingPrice: { originalPrice: string; discountPct: string } | null
}
```

## 7. Client layout

```
client/src/features/collect/
└── ebay/
    ├── api/
    │   ├── get-search.ts          # apiClient + useQuery
    │   ├── get-aspects.ts
    │   └── get-quota.ts
    ├── hooks/
    │   └── use-ebay-watch.ts      # EventSource lifecycle
    ├── components/
    │   ├── FilterPanel.tsx        # SearchFilters builder
    │   ├── AspectSelect.tsx       # dynamic dropdowns from /aspects
    │   ├── ResultCard.tsx
    │   └── WatchFeed.tsx
    ├── types/
    │   └── ebay.schema.ts         # Zod for SearchFilters, CompactItem, SearchResult
    └── index.ts                   # barrel
```

### `use-ebay-watch.ts`

```ts
export function useEbayWatch(filters: SearchFilters | null): {
  items: CompactItem[]
  status: 'idle' | 'connecting' | 'open' | 'error' | 'rate_limited'
  lastHeartbeat: Date | null
  newItemsInLastPoll: number
  error: string | null
  reconnect: () => void
}
```

- `filters === null` ⇒ idle (don't open).
- `new EventSource(\`${API_URL}/api/collect/ebay/watch?${qs}\`, { withCredentials: true })`.
- Validate every `item` payload with the same Zod schema used by `/search`.
- Cleanup on unmount or filter change.
- Browser auto-reconnects on transient drops; surface that via `status`.

### Routes & paths

`config/paths.ts` — add under `paths.app.collect`:

```ts
search:    { path: 'search',    getHref: () => '/app/collect/search' },
watch:     { path: 'watch',     getHref: () => '/app/collect/watch' },
```

`app/router.tsx` — add two children under the existing `paths.app.collect.root` block:

```ts
{ path: 'search', lazy: () => import('./routes/collect/search').then(m => ({ Component: m.CollectSearch })) },
{ path: 'watch',  lazy: () => import('./routes/collect/watch').then(m => ({ Component: m.CollectWatch })) },
```

The dashboard at `/app/collect/dashboard` becomes a real overview (quota
meter, last 5 watches in this session, link to start a new search/watch).
Don't fabricate metrics — if no watch has ever run this session, the
dashboard says so with a dashed-border CTA (per CLAUDE.md §"Empty states
are part of the design").

Navbar (`features/shared/navigation/Navbar.tsx`) — add a `Collect` entry to
`NAV_ITEMS` so it ships to both the desktop pill row and the mobile
dropdown.

### Styling

Route CSS files at `client/src/app/routes/collect/dashboard.css`,
`search.css`, `watch.css`, scoped by `.axeous-collect-dashboard`, etc. Use
`var(--radius-md)` for cards-inside-cards (result tiles),
`var(--radius-lg)` for the main result card surfaces, `var(--radius-full)`
for filter chips. Accent colors: keep the warm amber/red/pink palette
already used on the public `/collect` landing for product cohesion, but
route them through CSS vars in `client/src/index.css` (e.g.,
`--collect-accent: var(--orange)`) rather than hex literals. `--coral`
stays reserved for errors.

## 8. Rate-limit budget — applied to this app

| Scenario | Calls/day | Verdict |
|---|---|---|
| 1 watch, 30s interval | 2,880 | Saturates quickly — dev only |
| 1 watch, 60s interval | 1,440 | Default |
| 3 watches, 60s | 4,320 | Safe |
| 4+ watches, 60s | 5,760+ | Reject |

Default `WATCH_MAX_CONCURRENT=3`. Once usage is real, submit the eBay
Application Growth Check.

## 9. Implementation order

1. EPN approval + dev keyset (blocking, days).
2. Env vars in Render and `.env.local`; startup log in `server/src/index.ts`.
3. `ebay.auth.ts` + token-caching unit test (single-flight under concurrent
   calls).
4. `ebay.filters.ts` + serialization unit tests (the punctuation is
   fragile).
5. `ebay.client.ts` — hit production with a hard-coded `q=iphone&limit=2`;
   **confirm `itemAffiliateWebUrl` populated**.
6. `ebay.routes.ts` — wire `/search` and `/aspects` first. Smoke-test from
   `curl` (with a session cookie).
7. Client Zod schemas + `apiClient` queries for `/search` and `/aspects`.
   Replace `dashboard.tsx` placeholder with a working browse view.
8. `ebay.watch.ts` poll loop + `/watch` SSE route.
9. `use-ebay-watch.ts` + `WatchFeed.tsx`. End-to-end stream on
   `q=carhartt jacket&sort=newlyListed`.
10. Guardrails: concurrent cap, daily counter, `rate_limit` event
    surfacing in the UI banner.
11. Navbar entry; mobile QA at 390×844; `npx tsc --noEmit` from `client/`.

## 10. Confirmed decisions

1. **Auth on the eBay routes** — all `/api/collect/ebay/*` routes require
   auth. Gives us a stable identity for the concurrent-watch cap and
   aligns with the already-protected `/app/collect` shell.
2. **Public `/collect` landing** — untouched in this iteration. Stays as
   the "coming soon" marketing page.
3. **Aspect-filter caching** — discovery responses cached per `categoryId`
   for ~1 hour in module memory.
4. **One-shot search caching** — 30s in-memory LRU on the server bypassed
   whenever `sinceISO` is present, so watch-poller traffic always hits
   eBay live.
