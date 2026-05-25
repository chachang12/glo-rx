# Axeous Collect — Persistent Watches + Telegram Notifications

Design doc for evolving Collect's ephemeral SSE watches into persistent,
server-scheduled watches that can notify users via Telegram when they're
not on the page. Builds on the foundation in
[collect-ebay-design.md](collect-ebay-design.md).

## 1. Goal & non-goals

A user opens Collect, configures a watch ("Carhartt Detroit jacket, used,
under $80"), and walks away. Hours later their phone buzzes — Telegram
message: "🔔 Carhartt watch — 2 new" with links. They tap, decide, buy.
That's the user story.

### In scope (v2)

- Mongo-backed `Watch` collection — watches survive page reloads, browser
  closes, server restarts
- Mongo-backed `WatchMatch` collection — items observed per watch, kept
  for replay when the user comes back to the page
- Single server-side scheduler (one tick per ~15s) that polls all active
  watches, regardless of who's connected
- Telegram bot integration — deep-link account linking, batched
  per-poll messages, sensible formatting
- Per-watch notify mode: `sse_only`, `telegram_only`, `both` (default)
- Watch management UI under `/app/collect/watches` — list, pause, resume,
  delete, view match history
- Per-user + global active-watch caps to protect the 5,000/day eBay quota

### Out of scope (defer)

- SMS / Twilio / WhatsApp dispatch (separate cost + 10DLC overhead)
- Email digests (could come later; same dispatcher slot)
- Web push notifications (browser-side, separate auth flow)
- Charts / earnings attribution on matched items
- Sharing watches between users
- Cross-marketplace watches (still US only)

## 2. Mapping to existing codebase

| Concern | Today (v1) | After v2 |
|---|---|---|
| Watch lifetime | While EventSource is open | Persistent until user deletes |
| Polling | Per-connection async loop in `ebay.watch.ts` | Single scheduler tick in a new `watch.scheduler.ts` |
| State storage | In-memory `Map<watchId, WatchEntry>` | Mongo collections `Watch`, `WatchMatch` |
| SSE route | Runs the poll loop directly | Subscribes to a watch's match stream via in-process registry |
| Telegram | n/a | New `server/src/features/collect/telegram/` module |
| Dispatcher | Inline `send('item', item)` | `dispatchMatches(watch, items)` picks SSE and/or Telegram |
| User model | `auth.user` only | Add `telegramChatId`, `telegramUsername`, `telegramLinkedAt` |
| Render infra | Free tier OK (ephemeral) | **Starter ($7/mo) required** — scheduler needs an always-on process |

## 3. Environment variables

```bash
# Add to server/.env and Render
TELEGRAM_BOT_TOKEN=                  # from @BotFather
TELEGRAM_BOT_USERNAME=AxeousBot      # without the @, used to build deep links
TELEGRAM_WEBHOOK_SECRET=             # random hex string; lets us verify webhook calls
SCHEDULER_TICK_MS=15000              # 15s — scheduler looks for due watches
WATCH_MAX_PER_USER=1                 # see §8 quota math
WATCH_MAX_GLOBAL=3                   # hard cap until eBay grants more quota
MATCH_RETENTION_DAYS=30              # TTL on WatchMatch documents
```

`WATCH_POLL_INTERVAL_MS` (existing) becomes the *minimum* poll interval —
the scheduler honors `watch.nextPollAt`, which is derived from this value
plus a small jitter to avoid synchronized poll storms.

## 4. Data model

### 4.1 `Watch` collection

```ts
{
  _id: ObjectId
  authId: string            // indexed
  name: string              // user-facing label, default derived from filters
  filters: SearchFilters    // same shape as today
  notifyMode: 'sse_only' | 'telegram_only' | 'both'
  status: 'active' | 'paused' | 'rate_limited' | 'error'
  startedAt: Date
  lastPolledAt: Date | null
  nextPollAt: Date | null   // indexed — scheduler queries `nextPollAt <= now`
  seenItemIds: string[]     // bounded to last 2000 IDs (slice on every save)
  matchCount: number        // lifetime counter
  lastError: { message, status, at } | null
  createdAt: Date
  updatedAt: Date
}
```

**Why bound `seenItemIds` to 2000?** A watch polling every 60s for a week
sees ~10k items. Unbounded growth means slow saves + huge docs. 2000 IDs
covers ~the last 33 hours of poll matches, which is long past the point
where eBay's `newlyListed` sort would re-surface them. Items older than
that aren't going to come back as "new."

**Indexes:**
- `{ authId: 1, status: 1 }` — user-scoped lookups
- `{ status: 1, nextPollAt: 1 }` — scheduler tick

### 4.2 `WatchMatch` collection

```ts
{
  _id: ObjectId
  watchId: ObjectId            // indexed
  authId: string               // denormalized for fast user-scoped queries, indexed
  item: CompactItem            // full projected shape (same as today's SSE payload)
  matchedAt: Date              // TTL anchor
  notified: { sse: boolean; telegram: boolean }
}
```

**TTL index:** `{ matchedAt: 1 }` with `expireAfterSeconds = MATCH_RETENTION_DAYS * 86400`.
Mongo auto-deletes old matches.

### 4.3 Additions to existing `User` collection

```ts
telegramChatId: string | null
telegramUsername: string | null  // for display only ("Linked as @cole")
telegramLinkedAt: Date | null
```

### 4.4 New `TelegramLinkCode` collection

Short-lived link tokens.

```ts
{
  code: string                 // 8 hex chars, unique
  authId: string
  expiresAt: Date              // TTL — auto-prunes
}
```

**TTL index:** `{ expiresAt: 1 }` with `expireAfterSeconds = 0`.

## 5. Server architecture

### 5.1 Module layout

```
server/src/features/collect/
├── ebay/                          # existing
└── watch/                         # NEW — was conceptually in ebay.watch.ts
    ├── watch.model.ts             # Watch + WatchMatch schemas
    ├── watch.routes.ts            # CRUD: list, create, get, update, delete, stream
    ├── watch.scheduler.ts         # single setInterval, finds due watches, polls, dispatches
    ├── watch.dispatcher.ts        # routes matches to SSE and/or Telegram
    ├── watch.sse-registry.ts      # in-process Map<watchId, send-fn> for live SSE subscribers
    └── index.ts

server/src/features/collect/telegram/   # NEW
├── telegram.model.ts              # TelegramLinkCode schema
├── telegram.routes.ts             # link, unlink, webhook
├── telegram.client.ts             # sendMessage, sendBatch
├── telegram.formatter.ts          # CompactItem[] → HTML message
└── index.ts
```

### 5.2 Scheduler

A single `setInterval(tick, SCHEDULER_TICK_MS)` started in `server/src/index.ts` after DB connection.

```ts
async function tick() {
  if (quotaPercentUsed() >= 0.95) return  // bail near quota ceiling

  const due = await WatchModel.find({
    status: 'active',
    nextPollAt: { $lte: new Date() },
  })
    .limit(5)                              // bounded fanout per tick
    .sort({ nextPollAt: 1 })               // oldest-due first

  // Sequential to share quota fairly across watches; parallelism not needed at this scale.
  for (const watch of due) {
    if (quotaPercentUsed() >= 0.95) {
      watch.status = 'rate_limited'
      await watch.save()
      break
    }
    await pollOneWatch(watch)
  }
}

async function pollOneWatch(watch) {
  const sinceISO = computeSinceISO(watch)
  let items: CompactItem[]
  try {
    const result = await searchItems({ ...watch.filters, sort: 'newlyListed' }, { sinceISO })
    items = result.items.filter(i => !watch.seenItemIds.includes(i.itemId))
  } catch (err) {
    watch.lastError = projectError(err)
    watch.status = fatalEbayError(err) ? 'error' : 'active'
    watch.nextPollAt = new Date(Date.now() + watchInterval(watch))
    await watch.save()
    return
  }

  if (items.length > 0) {
    await dispatchMatches(watch, items)         // §5.4
    watch.seenItemIds = [...watch.seenItemIds, ...items.map(i => i.itemId)].slice(-2000)
    watch.matchCount += items.length
  }

  watch.lastPolledAt = new Date()
  watch.nextPollAt = new Date(Date.now() + watchInterval(watch) + jitter())
  watch.lastError = null
  await watch.save()
}
```

**Jitter:** ±5s on `nextPollAt` so two watches created back-to-back don't
synchronize their polls forever.

**Per-watch interval:** for now, all watches use `WATCH_POLL_INTERVAL_MS`.
Could later be user-configurable (e.g. 30s premium, 5min free).

### 5.3 SSE registry

In-process map: `watchId → send(event, data) → Promise<void>`.

```ts
// watch.sse-registry.ts
const registry = new Map<string, (event: string, data: unknown) => Promise<void>>()
export function register(watchId, send) { registry.set(watchId, send) }
export function unregister(watchId) { registry.delete(watchId) }
export function get(watchId) { return registry.get(watchId) }
```

The new SSE route just registers itself and waits — it does not poll
anymore.

```ts
// GET /api/collect/watches/:id/stream
ebayWatchRoutes.get('/:id/stream', async (c) => {
  const watch = await WatchModel.findOne({ _id: c.req.param('id'), authId: c.get('user').id })
  if (!watch) return c.json({ error: 'not found' }, 404)

  return streamSSE(c, async (stream) => {
    const send = async (event, data) => {
      if (stream.aborted) return
      try { await stream.writeSSE({ event, data: JSON.stringify(data) }) }
      catch { /* connection closed */ }
    }

    register(String(watch._id), send)
    await send('connected', { watch })

    // Replay recent matches so the page isn't blank.
    const recent = await WatchMatchModel.find({ watchId: watch._id })
      .sort({ matchedAt: -1 }).limit(50).lean()
    for (const m of recent.reverse()) await send('item', m.item)

    // Wait until abort. No loop here — scheduler does the work.
    await new Promise<void>(resolve => stream.onAbort(resolve))
    unregister(String(watch._id))
  })
})
```

### 5.4 Dispatcher

```ts
async function dispatchMatches(watch: Watch, items: CompactItem[]) {
  const live = sseRegistry.get(String(watch._id))
  const wantsSse = watch.notifyMode !== 'telegram_only' && !!live
  const wantsTg =
    watch.notifyMode !== 'sse_only' &&      // mode allows TG
    (!live || watch.notifyMode === 'telegram_only')  // not currently on the page

  if (wantsSse) {
    for (const item of items) await live('item', item)
  }

  if (wantsTg) {
    const user = await getUser(watch.authId)
    if (user.telegramChatId) {
      await sendTelegramBatch(user.telegramChatId, watch, items)
    }
  }

  // Always persist regardless of dispatch outcome — replay needs them.
  await WatchMatchModel.insertMany(items.map(item => ({
    watchId: watch._id,
    authId: watch.authId,
    item,
    matchedAt: new Date(),
    notified: { sse: wantsSse, telegram: wantsTg },
  })))
}
```

**Critical rule for `both` mode:** if the user is on the page (SSE live),
they get SSE *only*. Telegram is suppressed to avoid double-notify. The
moment they close the tab and a new poll fires, Telegram resumes.

### 5.5 Watch CRUD endpoints

All `requireAuth`. Mounted under `/api/collect/watches`.

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/`             | List my watches |
| `POST`   | `/`             | Create. 429 if global or per-user cap reached |
| `GET`    | `/:id`          | Get one |
| `PATCH`  | `/:id`          | Update name / status / notifyMode |
| `DELETE` | `/:id`          | Delete (and TTL'd matches expire on their own) |
| `GET`    | `/:id/stream`   | SSE stream — see §5.3 |
| `GET`    | `/:id/matches`  | Paginated match history |

The existing `/api/collect/ebay/watch` route (the ephemeral one) is
deprecated and removed — saved watches replace it.

## 6. Telegram

### 6.1 Bot setup (one-time, manual)

1. DM `@BotFather` on Telegram → `/newbot` → name `Axeous Collect` → username `AxeousCollectBot` (or whatever's available)
2. Receive bot token → put in `TELEGRAM_BOT_TOKEN`
3. Generate webhook secret: `openssl rand -hex 32` → `TELEGRAM_WEBHOOK_SECRET`
4. Register webhook:
   ```bash
   curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook \
     -d "url=https://api.axeous.com/api/collect/telegram/webhook" \
     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
5. Set bot commands (optional but nice):
   ```bash
   curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setMyCommands \
     -H 'Content-Type: application/json' \
     -d '{"commands":[{"command":"start","description":"Link your Axeous account"},{"command":"stop","description":"Stop notifications"},{"command":"help","description":"Show help"}]}'
   ```

### 6.2 Linking flow

```
┌─ User on Collect profile ──────────────────────┐
│   [ Connect Telegram ]                         │
└────────┬───────────────────────────────────────┘
         │ POST /api/collect/telegram/link
         ▼
   Server: generates linkCode (8 hex), stores
   { code, authId, expiresAt: now+10min }
   Returns { code, botStartUrl }
         │
         ▼
   UI: opens https://t.me/AxeousBot?start=<code>
         │
         ▼
   User taps "Start" in Telegram
         │
         ▼
   Telegram → POST /api/collect/telegram/webhook
   Body includes message text "/start <code>"
         │
         ▼
   Server: look up code → validate not expired
   → write user.telegramChatId = update.message.chat.id
   → reply via sendMessage: "✅ Connected to Axeous Collect"
         │
         ▼
   UI: was polling GET /api/user/me; sees telegramChatId
       → swaps button to "✅ Connected as @cole"  [ Disconnect ]
```

**Why polling vs. WebSocket on the UI?** The frontend already uses TanStack
Query; we add a 2-second `refetchInterval` to the `useGetMe` hook while the
link modal is open, then turn it off. No extra plumbing.

### 6.3 Webhook endpoint

```ts
telegramRoutes.post('/webhook', async (c) => {
  // Verify Telegram's secret header
  const secret = c.req.header('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.json({ error: 'invalid secret' }, 401)
  }

  const update = await c.req.json()
  const message = update.message
  if (!message?.text) return c.body(null, 200)

  const text = message.text.trim()
  const chatId = String(message.chat.id)

  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1]
    await handleStart(code, chatId, message.from)
  } else if (text === '/stop') {
    await handleStop(chatId)
  } else if (text === '/help') {
    await sendMessage(chatId, '<b>Axeous Collect</b>\nYou\'ll get a message when one of your saved watches finds a new listing.\n\n/stop — disconnect\n/help — this message', 'HTML')
  }

  return c.body(null, 200)
})
```

### 6.4 Message format

One message per poll, regardless of match count. HTML mode for safe
escaping.

```html
🔔 <b>Carhartt jacket</b> — 3 new

1. <a href="https://t.co/abc">Carhartt Detroit Jacket</a>
   $89 · Used · @seller (99.8%)

2. <a href="https://t.co/def">Carhartt Chore Coat</a>
   $120 · New · @seller2 (100%)

3. <a href="https://t.co/ghi">Carhartt Active Jac</a>
   $65 · Used · @seller3 (98.2%)

<i>Manage in Axeous Collect</i>
```

The links use the eBay **affiliate URL** when present (the whole point of
EPN). If we ever support more than 5 matches in one batch, truncate and
append "+ N more in app."

### 6.5 Telegram error handling

- `403` (user blocked the bot) → set `user.telegramChatId = null`, pause all `telegram_only` watches for that user
- `429` (rate limit) → respect `retry_after`, log
- 5xx → retry once with 1s delay, then drop
- Anything else → log + drop; don't block the scheduler

## 7. Client changes

### 7.1 New routes

```
/app/collect/watches              — list saved watches
/app/collect/watches/new          — create form (reuses FilterPanel)
/app/collect/watches/:id          — detail: filter summary + live SSE feed + match history
```

The existing `/app/collect/watch` route is removed. The "Watch" link in
`CollectNavbar` becomes "Watches" → `/app/collect/watches`.

### 7.2 Watch list page

```
┌─ My Watches ─────────────────────────────────────────┐
│  [ + New watch ]                                     │
│                                                      │
│  🟢  Carhartt jackets             3 matches today    │
│      Active · last polled 2m ago · Both              │
│      [ View ]  [ Pause ]                             │
│                                                      │
│  ⏸  Vintage Pyrex                 0 today / 12 total │
│      Paused · last polled 6h ago · Telegram only     │
│      [ View ]  [ Resume ]                            │
│                                                      │
│  ⚠️  Mid-century lamps             —                 │
│      Error: 429 from eBay · last 12m ago             │
│      [ View ]                                        │
└──────────────────────────────────────────────────────┘
```

### 7.3 Watch detail page

Three vertical sections:

1. **Header** — name (editable inline), status pill, "Pause/Resume", "Delete"
2. **Settings** — notify-mode segmented control (SSE / Telegram / Both),
   "Edit filters" link (opens the FilterPanel pre-filled)
3. **Stream + history** — live SSE items at top (today's `WatchFeed`),
   replayed recent matches below from `GET /:id/matches`

Notify-mode toggle UI:

```
Notify:   [ App only ]  [ Telegram only ]  ●●● Both
```

If the user picks Telegram only or Both and hasn't linked their account
yet, show a banner: "Link Telegram to receive notifications. [ Connect ]"

### 7.4 Telegram link UI (on `/app/collect/profile`)

New row in the Account section:

```
┌──────────────────────────────────────────────────────────┐
│  📨  Telegram notifications                              │
│      Get pinged the moment a watch finds something       │
│                                                          │
│      ▢  Not connected                       [ Connect ]  │
└──────────────────────────────────────────────────────────┘
```

After linking:

```
│      ✅ Connected as @cole                  [ Disconnect ]│
```

The Connect button opens a small modal with the deep link button and a
"waiting for confirmation…" spinner that flips to "✅" when polling sees
the user has `telegramChatId` set.

### 7.5 Match history view

Paginated list at the bottom of the watch detail page. Same `ResultCard`
component as the live feed; just sourced from `/:id/matches` instead of
SSE.

## 8. Quota math & caps

With the 5,000/day eBay default quota and 60s polling:

| Active watches | Calls/day | Headroom |
|---|---|---|
| 1 | 1,440 | 71% free |
| 2 | 2,880 | 42% free |
| 3 | 4,320 | 14% free — at cap |
| 4 | 5,760 | over quota |

**Caps:**
- `WATCH_MAX_PER_USER = 1` initially. Bump to 2 after eBay grants more quota.
- `WATCH_MAX_GLOBAL = 3`. Hard cap.
- Both are enforced on watch creation; 429 + helpful error if hit.

**Grace mode:** when 90% of daily quota is consumed, the scheduler stops
polling and flips all `active` watches to `rate_limited` status. They
resume after UTC midnight (when the quota counter resets). The user sees
a banner.

**Get more quota:** submit eBay's
[Application Growth Check](https://developer.ebay.com/develop/apis/application-growth-check)
once usage is real. This is a free review; grants come in 1–2 weeks.

## 9. Render infra

Persistent watches need an always-on process. Free tier spins down after
15 min idle, which kills the scheduler.

**Recommended:** Render Web Service Starter ($7/mo, no spindown).

**Alternative:** Render Background Worker ($7/mo) running just the
scheduler, with the Hono web service handling routes. Cleaner separation
but doubles cost. Skip for v2; revisit if scheduler load grows.

## 10. Implementation phases

Each phase is independently shippable and revert-able.

### Phase 1 — Persistence foundation (~1.5 days)
1. `Watch` + `WatchMatch` Mongoose models
2. CRUD endpoints (`POST/GET/PATCH/DELETE /api/collect/watches`)
3. Migrate the in-memory `watches` Map in `ebay.watch.ts` to use the model
4. Client: `useGetWatches`, `useCreateWatch`, etc. + Watch list page
   (`/app/collect/watches`)
5. Remove the ephemeral `/app/collect/watch` route + `useEbayWatch` calls

**Done when:** users can create a watch, see it in their list, delete it.
Polling still happens per-connection (old code path). Telegram not yet
involved.

### Phase 2 — Scheduler + SSE registry (~1 day)
1. `watch.scheduler.ts` with `setInterval` tick
2. `watch.sse-registry.ts` in-process map
3. Rewrite `GET /:id/stream` to subscribe instead of poll
4. Remove per-connection poll loop (delete most of `ebay.watch.ts`)
5. Match persistence wired into `pollOneWatch`

**Done when:** scheduler polls watches even with no clients connected. SSE
streams replay recent matches on connect.

### Phase 3 — Telegram bot + linking (~1 day)
1. `@BotFather` setup, env vars
2. `telegram.client.ts` (`sendMessage` wrapper)
3. `TelegramLinkCode` model
4. `POST /link`, `POST /unlink`, `POST /webhook` routes
5. User-model additions: `telegramChatId`, `telegramUsername`, `telegramLinkedAt`
6. Client: Telegram row on Collect profile page

**Done when:** users can link/unlink Telegram. Bot replies to `/start <code>`
and `/help`, `/stop`.

### Phase 4 — Dispatcher + batching (~0.5 days)
1. `watch.dispatcher.ts` with notify-mode logic
2. `telegram.formatter.ts` — HTML message from `CompactItem[]`
3. Hook dispatcher into `pollOneWatch`
4. Client: notify-mode segmented control on watch detail page

**Done when:** end-to-end — create a watch with `both` mode, close the
tab, get a Telegram message on next match.

### Phase 5 — Polish + caps (~0.5 days)
1. Per-user + global cap enforcement on create (429)
2. `rate_limited` status + recovery on UTC reset
3. Match history view on detail page
4. Pause/resume buttons
5. Error states (Telegram blocked, eBay 401, etc.)
6. Submit Application Growth Check

**Total: ~4.5 days** of focused work. Phase 1+2 can interleave; Phase 3
can parallel with 1+2 since it's a separate module.

## 11. Open decisions

Recommendations as defaults — adjust as needed.

| Decision | Recommended | Reasoning |
|---|---|---|
| Default notify mode | `both` | Most-natural UX: see in app while there, get pinged when not |
| Per-user watch cap | 1 | Forces eBay quota fairness until we get more. Bump after Growth Check |
| Global watch cap | 3 | Matches the 5,000/day quota ceiling at 60s polling |
| Match retention | 30 days | Enough for "what did I miss this week?" without storage bloat |
| Watch name | Auto-generated from `q` + key filters; user can edit | Most users won't bother naming |
| Telegram `/stop` behavior | Disconnect (clears `telegramChatId`) + pause `telegram_only` watches | Symmetric with unlink button in app |
| Default poll interval | 60s | Same as today. Could go 30s for premium tier later |
| Ephemeral watches | Remove entirely | Saved watches are the right primitive; two concepts is confusing |
| Pause behavior | Stop polling, keep matches | User-controlled break, not destructive |
| Delete behavior | Hard delete + TTL'd matches expire on their own | Clean. Could add soft-delete later if needed |

If you have a different take on any of these, flag it and I'll bake your
answer in before we start Phase 1.
