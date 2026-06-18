# `.pipeline/` — agent handoff folder

This folder is the shared scratch space for the 4-agent feature pipeline (see
`.claude/agents/` and the `/ship` command in `.claude/commands/ship.md`).

Each stage writes one file; the next stage reads it. No agent needs to know what
the others are thinking — it just reads the file the previous stage left behind.

| Stage | Agent | Model | Writes | Reads |
|-------|-------|-------|--------|-------|
| 1 | `planner`  | opus   | `spec.md`         | the codebase, `CLAUDE.md`, `README.md` |
| 2 | `coder`    | sonnet | `changes.md` (+ code) | `spec.md` |
| 3 | `tester`   | sonnet | `test-results.md` (+ tests if a runner exists) | `changes.md`, `spec.md`, changed files |
| 4 | `reviewer` | opus   | `review.md`       | `spec.md`, `changes.md`, `test-results.md`, `git diff` |

## How to run

From Claude Code, on a feature branch (never `main`):

```
/ship add rate limiting to the login endpoint, max 5 attempts/min per IP, return 429
```

The orchestrator clears stale handoff files, then runs planner → coder → tester →
reviewer in order, pausing if the spec has OPEN QUESTIONS or if verification fails.
It never merges or pushes — it leaves the branch for your review. Read
`review.md` for the verdict (SHIP / NEEDS WORK / BLOCK).

## Repo-specific notes

- **Monorepo:** changes land in `client/` and/or `server/` (no root package.json).
- **No unit-test runner.** The `tester` stage gates on `npx tsc --noEmit` + `npm run lint`
  (client) + `npm run build`, plus a behavioral read-through and a list of manual
  browser checks. If a test runner is added later, the `tester` agent will also write
  and run tests.

## Why these files aren't committed

The handoff files (`spec.md`, `changes.md`, `test-results.md`, `review.md`) are
per-run artifacts and are git-ignored (see the root `.gitignore`). Only this README
is tracked, so the folder exists on a fresh clone. Read them during a run; they're
overwritten on the next `/ship`.
