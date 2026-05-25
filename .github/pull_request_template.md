## Summary

<!-- 1-3 sentences on *why* this change exists. The diff shows the what. -->

## Scope

<!-- Tick one. Reviewers use this to pick the right CODEOWNERS lens. -->

- [ ] `learn-` — Axeous Learn only
- [ ] `collect-` — Axeous Collect only
- [ ] `shared-` — touches cross-product code (auth, user, navigation, `lib/`, `paths.ts`, `features/shared/*`)
- [ ] `chore` — deps / tooling / infra

## Type

- [ ] Feature
- [ ] Fix
- [ ] Chore
- [ ] Hotfix (branched off `main`)

## Test plan

<!--
How did you verify this? Bullet the actual steps a reviewer could repeat.
For UI: list the routes you exercised + viewports (desktop + 390×844 mobile).
For API: which endpoint(s), what payloads, expected status codes.
-->

- [ ]
- [ ]

## Checklist

- [ ] Branch named `feature/<scope>-<name>` / `fix/<scope>-<name>` / `chore/<name>`
- [ ] `npx tsc --noEmit` clean in `client/` and `server/`
- [ ] `npm run build` clean in `client/` and `server/`
- [ ] If UI changed: verified on desktop and mobile (390×844)
- [ ] If API changed: matching zod schema in `features/<scope>/<feature>/types/`, server route updated, no inline `fetch` in components
- [ ] No fabricated demo data in user-facing components (see [CLAUDE.md](../CLAUDE.md))
- [ ] No new ad-hoc radii or repurposed semantic colors (see [CLAUDE.md](../CLAUDE.md))
- [ ] No secrets in the diff (`.env`, API keys, credentials)

## Screenshots

<!-- For UI changes. Before/after if it's a redesign. Delete this section otherwise. -->

## Notes for reviewers

<!--
Anything that would speed up review: known unknowns, decisions you'd like
a second opinion on, things intentionally out of scope. Delete if N/A.
-->
