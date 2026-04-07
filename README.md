# Axeous

AI-powered exam prep platform for NCLEX, MCAT, LSAT, CPA, and more. Practice tests, flashcard generation, and study plan management built for students who refuse to fail.

## Architecture

```
axeous/
├── client/          React + TypeScript + Vite + Tailwind
├── server/          Hono + TypeScript + MongoDB + Anthropic AI
└── composite_*.json Sample test data
```

### Client (`client/`)

Single-page React app with feature-based architecture.

| Tech | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tooling |
| Tailwind CSS 4 | Styling |
| React Router 7 | Routing |
| Better Auth (React) | Auth client + session hooks |
| pdfjs-dist | Client-side PDF text extraction |

### Server (`server/`)

Hono API server with modular feature structure.

| Tech | Purpose |
|---|---|
| Hono | HTTP framework |
| MongoDB + Mongoose | Database |
| Better Auth | Google OAuth + session management |
| Anthropic SDK | AI-powered flashcard generation + vignettes |

```
server/src/
├── config/          Database, exams registry, usage limits
├── lib/             Better Auth config
├── middleware/       Auth + usage gating
└── features/
    ├── abg/         ABG driller vignette generation
    ├── exam/        Exam catalog API
    ├── flashcard/   AI flashcard generator + format references
    ├── plan/        Study plan CRUD + usage tracking
    ├── session/     Test session history
    ├── test/        Community test bank
    └── user/        User profile + stats
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

- Client: http://localhost:5173/glo-rx/
- Server: http://localhost:3001
- Health check: http://localhost:3001/health

## Routes

### Public
| Path | Page |
|---|---|
| `/` | Marketing landing page |
| `/auth/login` | Google OAuth sign-in |

### Protected (`/app/*`)
| Path | Page |
|---|---|
| `/app/dashboard` | Home — stats, quick actions, enrolled plans |
| `/app/plans` | My enrolled study plans |
| `/app/plans/:examCode` | Plan detail — community tests, tools, resources |
| `/app/plans/:examCode/settings` | Plan settings — exam date, daily goal, remove |
| `/app/plans/:examCode/flashcards` | AI flashcard generator (text paste or PDF upload) |
| `/app/marketplace` | Browse and enroll in exam plans |
| `/app/test` | Practice test session |
| `/app/abg` | ABG interpretation driller |
| `/app/results` | Session history (stub) |
| `/app/profile` | Profile, sign out, delete account |
| `/app/settings` | App settings (stub) |

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/exams` | Active exam catalog |
| `GET` | `/api/exams/all` | All exams (including inactive) |
| `GET` | `/health` | Server health check |

### Authenticated
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user/me` | Current user profile (auto-creates on first login) |
| `PATCH` | `/api/user/me` | Update profile fields |
| `GET` | `/api/user/me/stats` | Dashboard stats (questions, accuracy, streak) |
| `DELETE` | `/api/user/me` | Delete account |

### Plans
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/plans` | List user's plans |
| `GET` | `/api/plans/:examCode` | Get specific plan |
| `POST` | `/api/plans` | Enroll in an exam |
| `PATCH` | `/api/plans/:examCode` | Update plan settings |
| `DELETE` | `/api/plans/:examCode` | Remove plan |

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
| `POST` | `/api/abg/vignette` | Generate clinical vignette |

## AI Usage Limits

AI-powered features (flashcard generation, ABG vignettes) are gated by plan-level daily limits:

| Tier | Daily AI Calls |
|---|---|
| Free | 50 |
| Pro | 500 |

Limits reset at midnight UTC. Usage is tracked per plan, not globally.

## Deployment (Render)

| Service | Type | Build | Start |
|---|---|---|---|
| Client | Static Site | `cd client && npm i && npm run build` | Publish: `client/dist` |
| Server | Web Service | `cd server && npm i && npm run build` | `cd server && npm run start` |

Set `VITE_API_URL` on the static site to point to the web service URL.

Update Google OAuth redirect URI to `https://<your-server>.onrender.com/api/auth/callback/google`.
