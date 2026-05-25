# Contributing

## Branching strategy

We use **GitHub Flow with an optional staging buffer**. One repo, one deploy, two products. Namespacing happens in code (the `shared/` / `learn/` / `collect/` folders) — _not_ in long-lived product branches.

```
main                     ← Render auto-deploys from here. Protected.
└── develop              ← (optional) integration buffer
    ├── feature/learn-leaderboard-redesign
    ├── feature/collect-marketplace-search
    ├── feature/shared-billing
    ├── fix/auth-cookie-domain
    └── chore/upgrade-react-router
```

### Branches

| Branch | Purpose | Lifetime |
|---|---|---|
| `main` | Production. Render auto-deploys on push. Protected. | Permanent |
| `develop` *(optional)* | Integration buffer. Promote to `main` to ship. | Permanent |
| `feature/<scope>-<name>` | New functionality. Branched off `develop` (or `main`). | Short-lived |
| `fix/<scope>-<name>` | Bug fix. | Short-lived |
| `chore/<name>` | Deps, tooling, infra. | Short-lived |
| `hotfix/<name>` | Branched off `main`, merged into `main` **and** `develop`. | Short-lived |

### Scope prefixes

Use these in `feature/` and `fix/` branch names so the PR list is scannable:

- `learn-` — Axeous Learn product (anything under `features/learn/` or `routes/learn/`)
- `collect-` — Axeous Collect product
- `shared-` — cross-product (auth, user, navigation, lib, paths, etc.)

Examples:
```
feature/learn-leaderboard-redesign
feature/collect-dashboard-skeleton
feature/shared-billing
fix/learn-plan-detail-readiness-loading
fix/shared-auth-cookie-domain
chore/upgrade-react-router
```

### Why not per-product develop branches?

We considered `develop/learn` and `develop/collect` → `main`. Rejected because:

- One deploy, one CI pipeline — product-isolated branches don't map to anything operational.
- Shared code (auth, user, navigation, `lib/api/`, `paths.ts`) lives everywhere; every shared change would need merging into both develop branches, drifting them constantly.
- The benefit ("Collect changes can't break Learn") is already delivered by code review + CI + the `features/<scope>/` folder layout.

The scope prefix gives you the same organizational signal without the merge friction.

## Pull requests

- Branch off `develop` if you use it, otherwise `main`.
- One topic per PR. If a PR exceeds ~500 lines of non-generated diff, split it.
- Title mirrors the branch — `feat(learn): leaderboard redesign`, `fix(shared): auth cookie domain`.
- **Squash-merge** by default. The PR is the unit of history; commit noise inside the branch doesn't survive.
- Required to merge:
  - Passing CI (typecheck + build on both `client/` and `server/`)
  - At least one Code Owner approval (see [`.github/CODEOWNERS`](.github/CODEOWNERS))

### Keeping your branch current

Prefer **rebase** over merge while a branch is in progress — keeps the diff focused:

```bash
git fetch origin
git rebase origin/develop      # or origin/main
```

Once a PR is open and others have reviewed, switch to **merge** for further updates so reviewers don't lose their place.

## Hotfix flow

When prod is broken and `develop` has unshipped work:

```bash
git checkout main
git pull
git checkout -b hotfix/<name>

# fix, commit, push, PR into main, squash-merge → Render redeploys

git checkout develop
git pull
git merge main                 # carry the fix into the next release
git push
```

## Local conventions

- **UI/UX rules:** see [CLAUDE.md](CLAUDE.md) (radius tokens, no-fake-data, color semantics, empty-state patterns).
- **Architecture:** see [README.md](README.md) (feature folder layout, API client, zod validation).
- **API calls** always go through `lib/api/client.ts` and per-feature `api/` files. Components never call `fetch` directly.
- **Feature placement:** anything in `features/shared/` affects both products — get a `@LEAD` review. Product code goes under `features/learn/` or `features/collect/`.
- **Secrets** never get committed. `.env` files are gitignored; use `.env.example` to document required variables.

## First-PR checklist

- [ ] Branch named `feature/<scope>-<name>` / `fix/<scope>-<name>` / `chore/<name>`
- [ ] `npx tsc --noEmit` clean in `client/` and `server/`
- [ ] `npm run build` clean in `client/` and `server/`
- [ ] PR title matches branch
- [ ] PR description explains _why_, not just _what_ (the diff shows the what)
- [ ] If UI changed: tested on desktop and mobile (390×844)
- [ ] If API changed: corresponding zod schema in `features/<scope>/<feature>/types/`
- [ ] No fabricated demo data in user-facing components (see CLAUDE.md)
