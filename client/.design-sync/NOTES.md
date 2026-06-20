# design-sync notes — Axeous Design System

Target project: `Axeous Design System` (`310c625a-527d-42e5-a577-275a943a961b`).
Run everything from `client/` (the DS "package"). This is an **app**, not a
component library, so the sync uses a hand-built entry + a compiled-CSS step.

## Build recipe (this repo is off the converter's default path)

There is no library `dist/`. Two Vite builds (config: `buildCmd`) feed the converter:

- `vite.config.dssync.ts` → one self-contained stylesheet (`cssCodeSplit:false`,
  `assetsInlineLimit` huge so Inter is inlined as data-URIs), copied to
  `.design-sync/styles/axeous-compiled.css`. `buildCmd` then concatenates
  `remote-fonts.css` + that into `cfg.cssEntry` =
  `.design-sync/styles/axeous-bundle.css` (gitignored, generated).
  NOTE: the converter appends `cssEntry`'s *raw text* into `_ds_bundle.css` and
  does NOT follow relative `@import`s — so cssEntry must be FULLY INLINED, never
  a wrapper. And a remote `@import url()` would be position-invalid mid-file, so
  Geist/JetBrains ship as remote-`src` `@font-face` rules (`remote-fonts.css`,
  committed), which are valid anywhere.
- `vite.config.dslib.ts` → `.design-sync/dist-lib/ds-entry.js`, an ESM lib built
  from `.design-sync/ds-entry.tsx` (curated re-exports of the 27 components).
  React is externalized; Vite resolves `import.meta.env`, `@/` aliases, JSX, CSS.
  `cfg.entry` points the converter at this prebuilt ESM (so esbuild never has to
  handle `import.meta.env`, which would crash the IIFE — see below).

Converter run (from `client/`):
`node .ds-sync/package-build.mjs --config design-sync.config.json --node-modules ./node_modules --entry .design-sync/dist-lib/ds-entry.js --out ./ds-bundle`

## Why the prebuilt entry (don't "simplify" this away)

- Top-level `import.meta.env` reads in `src/lib/api/client.ts` (`VITE_API_URL`,
  `.DEV`) and `src/config/feature-flags.ts`. esbuild stubs `import.meta` to `{}`
  in an IIFE, so `{}.env.VITE_API_URL` throws at module-eval and kills the WHOLE
  bundle. ~14 of the 27 components reach that code via api/auth hooks. Vite
  replaces `import.meta.env` at build, so the prebuilt ESM is clean. Feeding the
  converter raw `.tsx` (synth-entry) would reintroduce the crash.

## Fonts

- Tokens use `'Geist', 'Inter', 'JetBrains Mono'`. The app loads **Geist +
  JetBrains Mono at runtime via a Google Fonts `<link>` in index.html**, and
  Inter via `@fontsource-variable/inter` (family name "Inter Variable").
- The bundle reproduces this with remote-`src` `@font-face` rules for Geist +
  JetBrains Mono (`remote-fonts.css`, fetched from Google Fonts with a browser
  UA, committed) prepended to the compiled CSS, plus inlined Inter Variable.
  Remote `src:` (not `@import`) so the rules are valid anywhere in `_ds_bundle.css`.
  Geist/JetBrains load from gstatic at runtime (`[FONT_REMOTE]`/informational);
  `cfg.runtimeFontPrefixes` suppresses `[FONT_MISSING]`. Matches production.
  Re-sync risk: gstatic URLs in `remote-fonts.css` are versioned and can rot —
  re-fetch if Geist stops rendering.

## Component notes

- `FlashcardGenerator` imports `pdfjs-dist` at top level → the lib is ~1 MB and
  the bundle carries `import.meta.url` inside pdfjs's Node-only branch (stubbed,
  never runs in-browser). Expected, not a regression.
- Self-fetching (need QueryClient) — render loading/empty without a provider:
  `MultiView`, `TelegramRow`, `AdvancedModeRow`, `WatchFeed`, `FlashcardGenerator`.
- Router-dependent (need a Router): `Navbar`, `CollectNavbar`, `MultiView`,
  `LoginForm`. Authored previews wrap these in MemoryRouter/QueryClientProvider
  inside the `.tsx`.
- Excluded as non-UI: route guards (`ProtectedRoute`, `AdminRoute`,
  `ContributorRoute`, `ResearcherRoute`), `PostLoginRedirect`, `theme-provider`,
  app `provider`/`router`/`index`.

## Preview authoring (carried-forward learnings)

- **Every preview wraps content in `<Surface>` (`.design-sync/previews/_frame.tsx`)** —
  dark-first app; the preview card body is white, so without it near-white text
  is invisible. Real designs get the dark body from styles.css; this is preview-only.
- **Context providers are re-exported from `ds-entry.tsx`** (`QueryClient`,
  `QueryClientProvider`, `MemoryRouter`). react-query + react-router are bundled
  INLINE (only react/react-dom externalized), so a provider imported from
  node_modules is a different module instance → "No QueryClient set" / null router
  context. Previews MUST import providers from `'glo-practice-tester'` to share
  context identity with the components' bundled hooks. To populate a self-fetching
  component, create the bundle's `QueryClient` and `qc.setQueryData(<key>, mock)`
  (read the key from the component's `../api/*` hook).
- **Overlays/portals**: `Modal` (portal, `fixed inset-0`) has
  `cfg.overrides.Modal={cardMode:single,viewport:560x440}`. `AiTutorPanel` is a
  `fixed` bottom-sheet — give its Surface `minHeight:560, position:relative`.
- **Prop gotchas**: `SessionHud.accuracy` is 0–100 (not 0–1), null→"—".
  `UserAvatar.size` is `'sm'|'md'|'lg'`. `RoadmapTrack` default `trackWidth`
  (≥1400) overflows the card — pass explicit `trackWidth`/`trackHeight`, Surface
  `padding:0`. `SessionReview` `answers`/`outcomes` are records keyed by `q._id`.
- **Types**: `RoadmapDay` is on the package barrel; session/ebay types are not —
  `import type { X } from '@/features/...'` (the `@/` alias resolves in previews).
- Raw cell screenshots are a fixed viewport: the card renders at top with a tall
  dark band below (empty viewport, NOT a defect).
- **Scoped-CSS coupling (DS caveat):** `TelegramRow` and `AdvancedModeRow` emit
  bare `.row-item`/`.row-icon`/`.row-action` markup whose CSS only exists under
  the route scope `.axeous-collect-profile .row-*` (and `.axeous-profile` for the
  Learn profile rows). They are NOT self-contained — their previews wrap them in
  `<div className="axeous-collect-profile"><div className="card section-card">…`
  (faithful to `routes/collect/profile.tsx`). Any design using these must supply
  that ancestor scope or they render unstyled.
- **Seeding query keys** (for populated self-fetching previews):
  `useGetMe`→`['user','me']`; `useGetWatches`→`['collect','watches','list']`;
  `useGetEbayAspects`→`['collect','ebay','aspects',categoryId,q??'']`;
  `useKnownPurchasedItems`→`['collect','purchases','known-items']`.
- **SSE streams aren't seedable:** `MultiView` quadrants + `WatchFeed` use a local
  EventSource (`useWatchStream`), no harness backend → previews show the real
  "Connecting…"/empty state (styled, honest).
- **Static-state ceilings (honest, not faked):** `PracticeSession` always opens on
  question 0 (`active` phase — no prop seeds revealed/complete); `AbgDriller` opens
  on `setup`; `FlashcardGenerator` opens on the paste-text idle form (PDF dropzone
  is behind a toggle). These are internal state-machine limits — reaching later
  phases needs interaction. PracticeSession/AbgDriller render full-bleed dark
  layouts, so their Surface uses `padding:0`.

## Re-sync risks (what can silently go stale)

- **Compiled CSS is regenerated, not committed.** `axeous-compiled.css` and
  `dist-lib/` are gitignored build output; a fresh clone must run `buildCmd`
  before the converter or designs render against stale/missing styles.
- **Vite version drift.** Built with Vite 7.3.1. A major Vite bump could change
  lib-mode output (chunking, import.meta handling) — re-verify the bundle.
- **import.meta.env coverage.** If a NEW component reaches code with top-level
  `import.meta.env` that the prebuilt ESM doesn't cover, the IIFE could crash.
  The Vite lib build covers all `import.meta.env`, so adding components to
  `ds-entry.tsx` + `componentSrcMap` keeps it covered — but a component pulling a
  Node-only dep (like pdfjs) may add more `import.meta.url` stubs.
- **Google Fonts dependency.** Designs fetch Geist/JetBrains from Google at
  runtime; offline they fall back (Geist→Inter→system), same as the deployed app.
