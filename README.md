# Axeous

AI-powered platform with two products under one roof:

- **Axeous Learn** — exam prep for NCLEX, MCAT, LSAT, CPA, and more. Practice tests, AI flashcards, custom study plans.
- **Axeous Collect** — eBay seller analytics (under development).

Both products share auth, user accounts, and billing, but are namespaced end-to-end so they can grow independently.

## Architecture

```
axeous/
├── client/          React 19 + Vite + TypeScript + Tailwind + TanStack Query
├── server/          Hono + TypeScript + MongoDB + Better Auth + Anthropic
└── composite_*.json Sample test data
```

### Client (`client/`)

Single-page React app following [Bulletproof React](https://github.com/alan2207/bulletproof-react) conventions. Each feature owns its API, types, components, and hooks.

| Tech | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tooling |
| Tailwind CSS 4 | Styling |
| React Router 7 | Routing |
| TanStack Query | Server state, caching, mutations |
| Zod | Runtime schema validation for API responses |
| Better Auth (React) | Auth client + session hooks |
| pdfjs-dist | Client-side PDF text extraction |

```
client/src/
├── app/
│   ├── provider.tsx              QueryClientProvider + ThemeProvider
│   ├── router.tsx                Route tree
│   └── routes/
│       ├── auth/login.tsx
│       ├── landing.tsx           Marketing root
│       ├── learn/
│       │   ├── index.tsx         /learn marketing page
│       │   ├── root.tsx          Authed /app/* shell
│       │   ├── dashboard.tsx
│       │   ├── plans.tsx · plan-detail.tsx · plan-settings.tsx · ...
│       │   ├── custom-plan-create.tsx · custom-plan-setup.tsx · ...
│       │   ├── test.tsx · abg.tsx · marketplace.tsx · leaderboard.tsx
│       │   ├── admin.tsx · admin-exam.tsx
│       │   └── profile.tsx · settings.tsx
│       └── collect/
│           ├── index.tsx         /collect marketing page
│           ├── root.tsx          /app/collect shell (placeholder)
│           └── dashboard.tsx     (placeholder)
├── features/
│   ├── shared/                   Cross-product
│   │   ├── auth/                 Better Auth hooks + ProtectedRoute / AdminRoute
│   │   ├── user/                 /api/user/* — me, stats, leaderboard, search
│   │   ├── friends/              /api/friends/* — requests, accept, decline
│   │   ├── navigation/           Navbar (Learn-only items for now)
│   │   └── ui/                   PageLoader, Tooltip
│   ├── learn/                    Learn-specific
│   │   ├── exams/                /api/exams/* — catalog, official tests, questions
│   │   ├── plans/                /api/plans/* — CRUD + readiness + roadmap + topic generation
│   │   ├── custom-plans/         /api/custom-plans/* — create, upload, extract, publish, clone
│   │   ├── tests/                /api/tests/* — community tests, exposure, PracticeSession
│   │   ├── sessions/             /api/sessions/* — completed session records
│   │   ├── flashcards/           /api/flashcards/* — AI generator
│   │   ├── abg/                  /api/abg/* — vignette generator + driller UI
│   │   ├── admin/                /api/admin/* — stats, users, exams, questions
│   │   └── roadmap/              Roadmap UI widget
│   └── collect/                  Empty — reserved for Collect features
├── lib/
│   ├── api/
│   │   ├── client.ts             Typed apiClient with zod validation
│   │   └── index.ts              Public re-exports (apiClient, ApiError)
│   ├── auth-client.ts            Better Auth client
│   └── utils.ts
└── config/
    └── paths.ts                  Centralized route paths
```

**Per-feature shape:**
```
features/<scope>/<feature>/
├── api/                 One file per endpoint: get-x.ts, create-x.ts, ...
│                        Each exports both a raw async fn and a use* hook.
├── components/          Feature-scoped UI
├── hooks/               Feature-scoped React hooks (when needed)
├── types/<name>.schema.ts   Zod schemas + inferred TS types
└── index.ts             Public barrel export
```

API calls never live in components — components import either the typed async function (`getPlans()`) or the matching hook (`useGetPlans()`) from the feature's `api/` folder. All responses are runtime-validated with zod before reaching components.

### Server (`server/`)

Hono API server. Features are namespaced into `shared/`, `learn/`, and `collect/`.

| Tech | Purpose |
|---|---|
| Hono | HTTP framework |
| MongoDB + Mongoose | Database |
| Better Auth | Google OAuth + session management |
| Anthropic SDK | AI generation (flashcards, ABG vignettes, exam questions) |

```
server/src/
├── config/             DB, exam seed registry, usage limits, schemas
├── lib/                Better Auth config
├── middleware/         requireAuth, requireAdmin, requireLicense, requireUsage
└── features/
    ├── shared/
    │   ├── admin/      /api/admin/* — platform admin
    │   ├── user/       /api/user/* — profile + stats + search
    │   └── friendship/ /api/friends/* — friend graph
    ├── learn/
    │   ├── abg/        /api/abg/* — vignette generation
    │   ├── exam/       /api/exams/* — catalog + question bank + exposure
    │   ├── flashcard/  /api/flashcards/* — AI flashcard generator
    │   ├── plan/       /api/plans/* — standard plan CRUD + roadmap
    │   ├── custom-plan/ /api/custom-plans/* — custom plan upload, extract, publish, clone
    │   ├── session/    /api/sessions/* — session history
    │   ├── test/       /api/tests/* — community test bank
    │   └── generation/ Shared question-generation service
    └── collect/
        ├── ebay-deletion/ /api/ebay-deletion — eBay marketplace deletion compliance webhook
        └── index.ts       /api/collect/* — stub mount point
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (free M0 tier works)
- Google Cloud OAuth credentials
- Anthropic API key

### 1. Clone and install

```bash
git clone <repo-url>
cd glo-practice-tester

cd client && npm install
cd ../server && npm install
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Fill in: MONGODB_URI, ANTHROPIC_API_KEY, BETTER_AUTH_SECRET,
#          GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# Client (optional — defaults to localhost:3001)
cp client/.env.example client/.env
```

### 3. Run locally

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

- Client: http://localhost:5173/
- Server: http://localhost:3001
- Health check: http://localhost:3001/health

## Routes

### Public
| Path | Page |
|---|---|
| `/` | Marketing landing page |
| `/learn` | Axeous Learn product page |
| `/collect` | Axeous Collect product page (coming soon) |
| `/auth/login` | Google OAuth sign-in |

### Learn — Protected (`/app/*`)
| Path | Page |
|---|---|
| `/app/dashboard` | Home — stats, quick actions, enrolled plans |
| `/app/plans` | My enrolled study plans |
| `/app/plans/:examCode` | Standard plan detail — readiness, roadmap, tests |
| `/app/plans/:examCode/settings` | Plan settings — exam date, daily goal, remove |
| `/app/plans/:examCode/flashcards` | AI flashcard generator (text paste or PDF upload) |
| `/app/plans/custom/new` | Create custom plan |
| `/app/plans/custom/:planId/setup` | Upload docs + extract topics |
| `/app/plans/custom/:planId` | Custom plan detail |
| `/app/plans/custom/:planId/settings` | Custom plan settings |
| `/app/plans/shared/:shareCode` | Preview + clone a published custom plan |
| `/app/marketplace` | Browse and enroll in exam plans |
| `/app/test` | Practice test session (community, official, topic, or bank) |
| `/app/abg` | ABG interpretation driller |
| `/app/leaderboard` | Friend leaderboard + friend requests |
| `/app/results` | Session history (stub) |
| `/app/profile` | Profile, sign out, delete account |
| `/app/settings` | App settings (theme, exam date, etc.) |
| `/app/admin` | Admin dashboard (admin-only) |
| `/app/admin/exams/:code` | Admin exam editor |

### Collect — Protected (`/app/collect/*`)
| Path | Page |
|---|---|
| `/app/collect/dashboard` | Placeholder dashboard |

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/exams` | Visible exam catalog (live + coming-soon) |
| `GET` | `/api/exams/all` | All exams (for plan-detail lookups) |
| `GET` | `/health` | Server health check |
| `POST` | `/api/ebay-deletion` | eBay marketplace deletion compliance webhook |
| `GET` | `/api/collect/health` | Collect stub health check |

### User (authenticated)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user/me` | Current user profile (auto-creates on first login) |
| `PATCH` | `/api/user/me` | Update profile fields |
| `DELETE` | `/api/user/me` | Delete account |
| `GET` | `/api/user/me/stats` | Dashboard stats (questions, accuracy, streak) |
| `GET` | `/api/user/search?q=` | Search users by name or username |
| `GET` | `/api/user/leaderboard` | Friend leaderboard entries |

### Friends
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/friends` | Current friends |
| `GET` | `/api/friends/requests/incoming` | Pending requests received |
| `GET` | `/api/friends/requests/outgoing` | Pending requests sent |
| `POST` | `/api/friends/request` | Send a friend request |
| `POST` | `/api/friends/accept` | Accept a request |
| `POST` | `/api/friends/decline` | Decline a request |
| `POST` | `/api/friends/block` | Block a user |
| `DELETE` | `/api/friends/:userId` | Remove a friend |

### Exams (authenticated)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/exams/:code/official-tests` | List official tests for an exam |
| `GET` | `/api/exams/official-tests/:testId` | Full official test with questions |
| `GET` | `/api/exams/:code/questions` | Question bank (smart ordering by exposure) |
| `POST` | `/api/exams/exposure` | Record question exposure |
| `POST` | `/api/exams/exposure/answer` | Record correctness for an exposed question |
| `POST` | `/api/exams/questions/:questionId/report` | Flag a question |

### Plans
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/plans` | List user's plans (standard + custom) |
| `GET` | `/api/plans/:examCode` | Get a specific standard plan |
| `POST` | `/api/plans` | Enroll in an exam |
| `PATCH` | `/api/plans/:examCode` | Update plan settings |
| `DELETE` | `/api/plans/:examCode` | Remove plan |
| `GET` | `/api/plans/:examCode/readiness` | Per-topic mastery + overall readiness |
| `GET` | `/api/plans/:examCode/topics` | Plan's topics |
| `POST` | `/api/plans/:examCode/topics/:topicId/generate-questions` | AI-generate questions for a topic |
| `GET` | `/api/plans/:examCode/topics/:topicId/questions` | List generated questions |
| `GET` | `/api/plans/:examCode/roadmap` | Day-by-day study roadmap |
| `POST` | `/api/plans/:examCode/roadmap/generate` | Generate roadmap from exam date |
| `PATCH` | `/api/plans/:examCode/roadmap/:dayNumber/complete` | Mark a day complete |

### Custom Plans
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/custom-plans` | Create a custom plan (requires license) |
| `POST` | `/api/custom-plans/:planId/upload` | Upload + parse a PDF/DOCX/PPTX document |
| `GET` | `/api/custom-plans/:planId/documents` | List uploaded documents |
| `POST` | `/api/custom-plans/:planId/extract-topics` | AI-extract topics from docs |
| `POST` | `/api/custom-plans/:planId/confirm-topics` | Save reviewed topic list |
| `GET` | `/api/custom-plans/:planId/topics` | Plan's topics |
| `POST` | `/api/custom-plans/:planId/topics/:topicId/generate-questions` | AI-generate topic questions |
| `GET` | `/api/custom-plans/:planId/readiness` | Mastery + readiness |
| `GET` | `/api/custom-plans/:planId/roadmap` | Study roadmap |
| `POST` | `/api/custom-plans/:planId/roadmap/generate` | Generate roadmap |
| `PATCH` | `/api/custom-plans/:planId/roadmap/:dayNumber/complete` | Mark a day complete |
| `POST` | `/api/custom-plans/:planId/publish` | Publish to share (returns shareCode) |
| `POST` | `/api/custom-plans/:planId/unpublish` | Unpublish |
| `GET` | `/api/custom-plans/shared/:shareCode` | Preview a shared plan |
| `POST` | `/api/custom-plans/shared/:shareCode/clone` | Clone a shared plan |

### Tests
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tests` | Community tests (filterable by examCode, tag, search) |
| `GET` | `/api/tests/mine` | User's uploaded tests |
| `GET` | `/api/tests/:id` | Full test with questions |
| `POST` | `/api/tests` | Upload a test |

### Sessions
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Save completed session |
| `GET` | `/api/sessions` | Session history |

### AI (auth + usage gated)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/flashcards/generate` | Generate flashcards from text |
| `POST` | `/api/abg/vignette` | Generate clinical vignette for ABG drill |

### Admin (auth + admin role required)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Platform-wide counts |
| `GET` | `/api/admin/users` | List users |
| `DELETE` | `/api/admin/users/:userId` | Delete a user and their data |
| `GET` | `/api/admin/exams` | List all exams |
| `GET` | `/api/admin/exams/:code` | Get a specific exam |
| `POST` | `/api/admin/exams` | Create exam |
| `PATCH` | `/api/admin/exams/:code` | Update exam |
| `DELETE` | `/api/admin/exams/:code` | Delete exam |
| `GET` | `/api/admin/exams/:code/official-tests` | List official tests |
| `POST` | `/api/admin/exams/:code/official-tests` | Create official test (JSON upload) |
| `DELETE` | `/api/admin/official-tests/:testId` | Delete official test |
| `GET` | `/api/admin/exams/:code/questions` | List question bank items |
| `POST` | `/api/admin/exams/:code/questions/bulk` | Bulk upsert questions |
| `DELETE` | `/api/admin/questions/:questionId` | Delete a question |
| `GET` | `/api/admin/flagged-questions` | Questions flagged by ≥5 users |

## AI Usage Limits

AI-powered features (flashcard generation, ABG vignettes, question generation) are gated by plan-level daily limits:

| Tier | Daily AI Calls |
|---|---|
| Free | 50 |
| Pro | 500 |

Limits reset at midnight UTC. Usage is tracked per plan, not globally.

## Conventions

- [CONTRIBUTING.md](CONTRIBUTING.md) — branching strategy, PR conventions, hotfix flow, first-PR checklist.
- [CLAUDE.md](CLAUDE.md) — UI/UX rules (radius tokens, no-fake-data, color semantics, empty-state patterns).
- [.github/CODEOWNERS](.github/CODEOWNERS) — required reviewers per path.

In short:
- **No fabricated data in user-facing components.** Wire to a real endpoint or show a real empty state.
- **Use radius/color tokens from `index.css`.** Don't introduce ad-hoc radii or repurpose `--coral` for neutral metrics.
- **API calls belong in `features/<scope>/<feature>/api/`.** Components import the function or hook, never raw `fetch` / `apiClient`.
- **Every API response is zod-validated.** If the server shape changes, the client throws a typed `ApiValidationError` instead of silently rendering garbage.
- **Branch naming:** `feature/<scope>-<name>`, `fix/<scope>-<name>`, `chore/<name>`. Scopes: `learn-`, `collect-`, `shared-`. See CONTRIBUTING.md.

## Deployment (Render)

| Service | Type | Build | Start |
|---|---|---|---|
| Client | Static Site | `cd client && npm i && npm run build` | Publish: `client/dist` |
| Server | Web Service | `cd server && npm i && npm run build` | `cd server && npm run start` |

Set `VITE_API_URL` on the static site to point to the web service URL.

Update Google OAuth redirect URI to `https://<your-server>.onrender.com/api/auth/callback/google`.
