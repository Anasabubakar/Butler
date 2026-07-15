<div align="center">
<img src="frontend/public/images/logo-gold.svg" alt="Butler" width="120" />
</div>

# Butler

**Your digital chief of staff.** Butler reads, writes, and moves across the
tools where your work lives — Google Workspace, GitHub, Notion, Slack, Linear,
Figma — and hands you a calm morning brief instead of another dashboard.

Built by [Anas Abubakar](https://github.com/Anasabubakar).

---

## Stack

| Layer     | Tech                                              |
| --------- | ------------------------------------------------- |
| Frontend  | Next.js 15 (App Router) · React 19 · Tailwind v4  |
| Backend   | Go · PostgreSQL                                   |
| Auth      | Firebase Authentication (Google OAuth)            |
| Hosting   | Vercel (frontend) · Docker / container (backend) |

---

## Repository layout

```
.
├── frontend/      # Next.js app — deployed to Vercel
├── backend/       # Go API + PostgreSQL migrations
├── vercel.json    # Tells Vercel to build ./frontend
├── docker-compose.yml
└── .env.example   # All required environment variables
```

---

## Quick start (frontend only)

```bash
cd frontend
cp ../.env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. The landing page is served at `/`, and the auth
screen lives at `/login`.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in your values. **Never commit
real secrets** — the frontend only uses `NEXT_PUBLIC_*` vars (safe to expose to
the browser); the backend keeps its secrets server-side.

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Backend (`backend/.env` or your host's secret manager)

```
PORT=8080
ENVIRONMENT=production
DATABASE_URL=postgres://user:pass@host:5432/butler
FIREBASE_PROJECT_ID=...
GEMINI_API_KEY=...          # server-side only
CORS_ORIGINS=https://your-vercel-domain.vercel.app
APP_BASE_URL=https://your-frontend-domain
PUBLIC_API_BASE=https://your-api-domain
TOKEN_ENCRYPTION_KEY=long-random-secret

# Optional OAuth apps (Integrations page)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=
```

Google Workspace connects via Firebase popup on the client, then the access token is vaulted server-side (`POST /api/integrations/google`). After vaulting, Command Center loads via:

- `GET /api/workspace/brief` — calendar, tasks, mail from vaulted token
- `POST /api/workspace/sync` — same + proactive notifications/draft delegations

Chat agent tools can read Workspace and **queue** Gmail/calendar actions as Delegated Work (approve-before-send).

GitHub / Slack / Notion / Linear use standard OAuth when their client credentials are set.

---

## Deploying the frontend to Vercel

The Next.js app lives in `frontend/`, not the repo root. This repo includes a
root `vercel.json` that points Vercel at the right directory:

Set **Root Directory** to `frontend` in the Vercel dashboard (Project Settings →
General). The repo `vercel.json` files assume that layout — do **not** use
`cd frontend` in install/build commands when Root Directory is already `frontend`.

- **Root Directory:** `frontend`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)

### Required Vercel environment variables

Add the `NEXT_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_API_URL` values from the
section above under **Settings → Environment Variables** before the first
deploy. Without them, the app builds but authentication will fail at runtime.

---

## Backend (local)

```bash
docker compose up -d db        # start PostgreSQL
cd backend
go run ./cmd/server            # or build your container
```

Run migrations from `backend/migrations` against your `DATABASE_URL`.

---

## Scripts

| Command           | Location   | Purpose              |
| ----------------- | ---------- | -------------------- |
| `npm run dev`     | frontend   | Local dev server     |
| `npm run build`   | frontend   | Production build     |
| `npm run lint`    | frontend   | ESLint + type check  |
| `go run ./cmd/server` | backend | Start the Go API |

---

## License

All rights reserved.
