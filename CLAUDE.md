# CLAUDE.md

Project-specific conventions for this repo. Read this before making UI changes.

The README covers what the app *is*. This file covers how to keep it from drifting back into a "generated" feel.

## Don't fabricate data the user can see

This is the #1 thing. The app must be honest about what it knows.

- **No hardcoded demo arrays in user-facing components.** No `ROADMAP_DAYS`, `RECENT_ACTIVITY`, fake topic mastery percentages, fake "+8% this week" deltas, fabricated question counts ("3,200+"), fake pass rates ("94%"), or fake "Popular / New" badges. The dashboard previously had all of these and they read as obviously made up the moment the rest of the page showed real zeros.
- **Wire to real APIs or show a real empty state.** `/api/user/me/stats`, `/api/plans`, `/api/exams`, `/api/user/leaderboard` are the real sources. If a component needs data we don't have an endpoint for, design an empty state with a CTA — don't make up the numbers.
- **No "Coming soon" rows in the user app.** If a feature isn't built, hide its row. Don't advertise incompleteness. (Acceptable on internal/admin pages or marketing copy if there's a clear plan.)
- **No marketing claims without backing data on the landing page.** No "180k+ practice questions" or "98% score improvement rate" unless those are computed from real records.

When you find numbers that look plausible but aren't traceable to an API response, treat them as bugs.

## Empty states are part of the design

`—` is a placeholder, not a finished state. A new user with zero activity should see:

- Real zeros in stat cards (`0/17 mastered`, `—` for accuracy with the subtitle "Answer questions to see this")
- Dashed-border CTA cards in the sections that would otherwise be empty ("Start a practice session to track your activity")
- A clear next action — not a bunch of em-dashes

See [client/src/app/routes/app/dashboard.tsx](client/src/app/routes/app/dashboard.tsx) and the `.plans-empty` / `.activity-empty` patterns in [dashboard.css](client/src/app/routes/app/dashboard.css) for the established shape.

## Radius scale — use the tokens

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

## Color is semantic, not decorative

- `--coral` (red) means **error / destructive only.** Don't use it for neutral metrics like streak counters — red signals "bad" and a 0-day streak rendered red looks like a warning. Use `--ink` for neutral metric text.
- `--green` means success / positive change.
- `--teal`, `--blue`, `--violet` are brand accents — fine for variety in icons, links, decorative dots. Don't try to make them mean specific things.
- Topic mastery progress bars previously used six different colors with no encoded meaning. Don't reintroduce that — pick one accent color or grade by mastery level.

When in doubt, default to `--ink` and let the layout do the work.

## Navigation must work on mobile

[client/src/features/navigation/Navbar.tsx](client/src/features/navigation/Navbar.tsx) renders the desktop pill nav under `sm:` and a hamburger panel under it. If you add a new top-level route, add it to `NAV_ITEMS` — both the desktop pill row and the mobile dropdown render from that array, so they stay in sync.

Don't reintroduce a `hidden sm:block` nav with no mobile fallback.

## CSS organization

Each route under `client/src/app/routes/app/` has a sibling `.css` file scoped by a route-level class (`.axeous-dashboard`, `.axeous-plans`, etc.). Keep route-specific styles there; share via `--token` variables in [index.css](client/src/index.css), not by importing CSS across routes.

Tailwind utility classes are fine for layout primitives (`flex`, `gap-*`, `sm:block`). Larger structural styling lives in the route CSS file.

## Stats endpoint shape

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

If you need finer-grained data (per-topic mastery breakdown, accuracy time series, recent sessions), don't fake it — add the endpoint. The pattern is in [server/src/features/user/user.routes.ts](server/src/features/user/user.routes.ts).

## When making UI changes

1. Run `npx tsc --noEmit` from `client/` before considering the work done.
2. If you touched the dashboard, plans, leaderboard, marketplace, profile, or landing — open the page in the browser and verify it renders. The chrome-devtools MCP is set up for this.
3. Test mobile (390×844) for any nav or layout-grid changes.
