# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The README covers what the app *is* and lists every route and endpoint. This file covers how to work in the repo without making it feel "generated."

## Commands

The repo is a monorepo with two independent npm packages — `client/` and `server/`. There is no root package.json. Always `cd` into one or the other first.

```bash
# Client (React + Vite, port 5173)
cd client
npm install
npm run dev              # vite dev server
npm run build            # tsc -b && vite build (typechecks then builds)
npm run lint             # eslint .
npm run preview          # serve the production build
npx tsc --noEmit         # typecheck only — run this before declaring UI work done

# Server (Hono + tsx, port 3001)
cd server
npm install
npm run dev              # tsx watch src/index.ts (hot reload)
npm run build            # tsc
npm run start            # node dist/index.js
npx tsc --noEmit         # typecheck only
```

There is no test runner configured in either package. Verification is `tsc --noEmit` + manual browser testing.

Environment files (`server/.env`, optional `client/.env`) are required for local dev — see README "Getting Started" for the variables. Without `MONGODB_URI`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, and `ANTHROPIC_API_KEY`, the server won't start.

Deployment is Render — `main` auto-deploys. See `project_deployment.md` in auto-memory for custom-domain / cookie / SPA-routing gotchas.

## Architecture

### Two products, one repo, one deploy

The app ships two products that share auth, user accounts, and billing but are namespaced end-to-end so they can evolve independently:

- **Axeous Learn** — exam prep (NCLEX, MCAT, LSAT, CPA, etc.). The mature product; nearly everything user-facing is Learn.
- **Axeous Collect** — eBay seller analytics. Stub today.

Namespacing happens in code via three sibling folders on both client and server:

```
features/
├── shared/    auth, user, friends, navigation, ui — touches both products
├── learn/     exam, plan, custom-plan, test, session, flashcard, abg, admin
└── collect/   ebay-deletion + stub mount
```

There are no per-product branches. The `shared/` folder is the seam — changes there affect both products and require extra review (see CONTRIBUTING.md / CODEOWNERS).

### Client (`client/`) — React 19 + Vite + TanStack Query + Better Auth

Bulletproof-React layout. The non-obvious rules:

**1. API calls live in `features/<scope>/<feature>/api/`, never in components.**
Each endpoint is one file (`get-x.ts`, `create-x.ts`) that exports both a raw async function and a matching `use*` hook. Components import one or the other — they must not call `fetch` or `apiClient` directly. The barrel `features/<scope>/<feature>/index.ts` re-exports the public surface.

**2. Every response is runtime-validated with zod before it reaches a component.**
Schemas live in `features/<scope>/<feature>/types/<name>.schema.ts` and the inferred TS types are derived from them. If the server shape drifts, the client throws a typed `ApiValidationError` from `lib/api/client.ts` instead of silently rendering garbage. When you add an endpoint, you add the schema — the typed `apiClient` in `lib/api/client.ts` expects one.

**3. Routes mirror the product split.**
`app/routes/landing.tsx` is the marketing root. Learn routes live in `app/routes/learn/` and mount at `/learn` (marketing) plus `/app/*` (authed shell `routes/learn/root.tsx`). Collect mirrors that at `/collect` and `/app/collect/*`. Route paths are centralized in `config/paths.ts` — use it instead of hardcoding strings.

**4. Auth is Better Auth.**
`lib/auth-client.ts` exposes the React client. `features/shared/auth/` provides `ProtectedRoute` and `AdminRoute` wrappers used in the router tree. Session state comes from Better Auth hooks; never roll your own.

### Server (`server/`) — Hono + Mongoose + Better Auth + Anthropic

```
server/src/
├── index.ts               app entry, route mount
├── config/                DB connection, exam seed registry, usage-limit constants, mongoose schemas
├── lib/                   Better Auth server config
├── middleware/            requireAuth, requireAdmin, requireLicense, requireUsage
└── features/<scope>/<feature>/
                           routes file + feature-local helpers
```

The non-obvious pieces:

**1. AI endpoints are gated by `requireUsage` middleware.**
Flashcard generation, ABG vignettes, and topic-question generation go through Anthropic and count against a per-user daily quota (Free: 50, Pro: 500, midnight UTC reset). The middleware enforces this — don't bypass it when adding new AI endpoints. Tier definitions live in `config/`.

**2. Question exposure and mastery are first-class.**
The `exam` feature tracks per-user exposure to each question (`QuestionExposure`) and uses it for smart ordering (`GET /api/exams/:code/questions`). Per-topic mastery is a **stored, denormalized** value on the `Topic` document (`mastery`/`questionsAnswered`/`correctCount`, updated via an EMA in `recordTopicAnswer`), and `/api/plans/:examCode/readiness` averages it. If you change the answer-recording flow, you're changing mastery — verify both ends.

> ⚠️ Known gap (storage audit): three answer-recording paths exist and don't reconcile — `Session.answers` (practice sessions), `QuestionExposure` (exam-bank answers), and `Topic.mastery` (the `/topics/:id/record` endpoint). The `record` endpoint is **not currently called by the client**, so `Topic.mastery` stays 0 and readiness reads 0 for real users. Resolving this is coupled to the per-user question-anchoring decision (a standard-plan `QuestionBankItem.topicId` points at whichever user's plan generated it, so mastery can't simply be derived from exposure by `topicId`). Pick one source of truth before building on mastery.

**3. Custom plans are a parallel hierarchy to standard plans.**
`/api/plans/*` operates on the standard exam catalog. `/api/custom-plans/*` operates on user-uploaded plans (PDF/DOCX/PPTX → AI topic extraction → AI question generation → optional publish/clone via `shareCode`). They share the readiness/roadmap shape but live in separate features (`plan/` vs `custom-plan/`) — don't try to unify them in a single handler.

**4. User auto-create on first authenticated request.**
`GET /api/user/me` creates the user row if it doesn't exist. New-user empty states (zero questions, no plans, streak 0) are the expected baseline, not a bug.

**5. The `/api/ebay-deletion` webhook is a compliance endpoint.**
eBay requires it for marketplace account deletion notices. It must remain public and respond correctly even before the rest of Collect is built.

### The stats contract

`GET /api/user/me/stats` returns:

```ts
{
  totalQuestions: number
  accuracy: number | null     // null until they answer something
  streak: number              // consecutive days
  daysToExam: number | null
  nextExamLabel: string | null
  masteredCount: number       // topics with mastery >= 80
  totalTopics: number
}
```

If you need finer-grained data (per-topic mastery breakdown, accuracy time series, recent sessions), don't fake it on the client — add the endpoint. Pattern: `server/src/features/shared/user/user.routes.ts`.

## UI/UX rules

These are the rules that keep the app from drifting back into a "generated" feel. They've all been violated before and re-fixed.

### Don't fabricate data the user can see

This is #1. The app must be honest about what it knows.

- **No hardcoded demo arrays in user-facing components.** No `ROADMAP_DAYS`, `RECENT_ACTIVITY`, fake topic mastery percentages, fake "+8% this week" deltas, fabricated question counts ("3,200+"), fake pass rates ("94%"), or fake "Popular / New" badges. The dashboard previously had all of these and they read as obviously made up the moment the rest of the page showed real zeros.
- **Wire to real APIs or show a real empty state.** `/api/user/me/stats`, `/api/plans`, `/api/exams`, `/api/user/leaderboard` are the real sources. If a component needs data we don't have an endpoint for, design an empty state with a CTA — don't make up the numbers.
- **No "Coming soon" rows in the user app.** If a feature isn't built, hide its row. Don't advertise incompleteness. (Acceptable on internal/admin pages or marketing copy if there's a clear plan.)
- **No marketing claims without backing data on the landing page.** No "180k+ practice questions" or "98% score improvement rate" unless those are computed from real records.

When you find numbers that look plausible but aren't traceable to an API response, treat them as bugs.

### Empty states are part of the design

`—` is a placeholder, not a finished state. A new user with zero activity should see:

- Real zeros in stat cards (`0/17 mastered`, `—` for accuracy with the subtitle "Answer questions to see this")
- Dashed-border CTA cards in the sections that would otherwise be empty ("Start a practice session to track your activity")
- A clear next action — not a bunch of em-dashes

See [client/src/app/routes/app/dashboard.tsx](client/src/app/routes/app/dashboard.tsx) and the `.plans-empty` / `.activity-empty` patterns in [dashboard.css](client/src/app/routes/app/dashboard.css) for the established shape.

### Radius scale — use the tokens

Defined in [client/src/index.css](client/src/index.css):

| Token | Value | Use |
|---|---|---|
| `var(--radius-sm)` | 6px  | Chips, tags, small badges, mini progress bars |
| `var(--radius-md)` | 10px | Buttons, inputs, inner list items, icon containers |
| `var(--radius-lg)` | 12px | Cards (the main app surface), modals, empty-state boxes |
| `var(--radius-full)` | 999px | Pills, capsule nav, avatars |

**Don't add new ad-hoc radii.** If you find yourself reaching for `14px` or `16px` or `18px`, pick `md` or `lg`. The whole point is that the page reads as one design system, not as ten separate decisions.

`50%` is fine for true circles (avatars, dots) and isn't part of the scale.

The landing page (`landing.css`) is intentionally exempt — it has its own visual language with the wireframe X and may use larger radii deliberately. The exemption only applies to landing.

### Color is semantic, not decorative

- `--coral` (red) means **error / destructive only.** Don't use it for neutral metrics like streak counters — red signals "bad" and a 0-day streak rendered red looks like a warning. Use `--ink` for neutral metric text.
- `--green` means success / positive change.
- `--teal`, `--blue`, `--violet` are brand accents — fine for variety in icons, links, decorative dots. Don't try to make them mean specific things.
- Topic mastery progress bars previously used six different colors with no encoded meaning. Don't reintroduce that — pick one accent color or grade by mastery level.

When in doubt, default to `--ink` and let the layout do the work.

### Navigation must work on mobile

[client/src/features/navigation/Navbar.tsx](client/src/features/navigation/Navbar.tsx) renders the desktop pill nav under `sm:` and a hamburger panel under it. If you add a new top-level route, add it to `NAV_ITEMS` — both the desktop pill row and the mobile dropdown render from that array, so they stay in sync.

Don't reintroduce a `hidden sm:block` nav with no mobile fallback.

### CSS organization

Each route under `client/src/app/routes/app/` has a sibling `.css` file scoped by a route-level class (`.axeous-dashboard`, `.axeous-plans`, etc.). Keep route-specific styles there; share via `--token` variables in [index.css](client/src/index.css), not by importing CSS across routes.

Tailwind utility classes are fine for layout primitives (`flex`, `gap-*`, `sm:block`). Larger structural styling lives in the route CSS file.

## When making UI changes

1. Run `npx tsc --noEmit` from `client/` before considering the work done.
2. If you touched the dashboard, plans, leaderboard, marketplace, profile, or landing — open the page in the browser and verify it renders. The chrome-devtools MCP is set up for this.
3. Test mobile (390×844) for any nav or layout-grid changes.

## Branching

GitHub Flow with squash-merge. Branches: `feature/<scope>-<name>`, `fix/<scope>-<name>`, `chore/<name>`, `hotfix/<name>`. Scopes are `learn-`, `collect-`, `shared-`. Hotfixes branch from `main` and must be merged back into both `main` and `develop`. Full rules in [CONTRIBUTING.md](CONTRIBUTING.md).
