# dsfnb

F&B operations dashboard and Koravo chat — Next.js app with Prisma, chat API, metrics/KPI, and optional SAGE/LLM integration.

## Stack

- **Next.js 16** (App Router), **React 19**, **Tailwind CSS**
- **Prisma** (PostgreSQL) — users, chat sessions, metrics, TIG constraints
- **Chat** — session-based chat with optional LLM narration (OpenAI-compatible)
- **Stats** — KPI API (revenue, waste, fulfilment) with mock fallback when DB is empty

## Getting started

### 1. Install and env

```bash
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL (PostgreSQL). Optionally ENCRYPTION_KEY, DEFAULT_CHAT_LLM_KEY.
```

### 2. Database

PostgreSQL required for chat and persisted data.

- **Local:** start Postgres (e.g. Docker: `docker run -d --name dsfnb-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dsfnb -p 5432:5432 postgres:16-alpine`)
- **Cloud:** use [Neon](https://neon.tech), [Supabase](https://supabase.com), or any Postgres and set `DATABASE_URL` in `.env`

Then:

```bash
npm run db:setup
```

This runs `prisma generate`, `prisma migrate dev`, and `prisma db seed`.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Chat, Dashboard, and Settings are available from the nav.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm run db:setup` | Generate, migrate, and seed DB |
| `npm run db:seed` | Run seed only |
| `npm run test:api` | Hit metrics and analytics APIs (dev server must be running) |
| `npm run test:chat` | Smoke test chat API (sessions + message) |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (for full app) | PostgreSQL connection string |
| `ENCRYPTION_KEY` | If using stored/LLM keys | 64 hex chars (32 bytes). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DEFAULT_CHAT_LLM_KEY` | Optional | API key for chat narration (OpenAI or compatible) |
| `DEFAULT_CHAT_LLM_URL` | Optional | Base URL (defaults to `https://api.openai.com` when key is set) |

See `.env.example` for a full template.

## Deployment (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add environment variables in the project settings:
   - `DATABASE_URL` — your production PostgreSQL URL (e.g. Neon, Supabase)
   - `ENCRYPTION_KEY` — 64 hex chars, if you use chat or stored API keys
   - `DEFAULT_CHAT_LLM_KEY` / `DEFAULT_CHAT_LLM_URL` — optional, for chat
3. Run migrations against the production DB once (e.g. locally with `DATABASE_URL` set to prod, then `npx prisma migrate deploy`, or use your DB provider’s SQL or CI).
4. Deploy. The build runs `prisma generate && next build` (see `vercel.json` and `package.json`).

For other platforms, run `prisma generate` before the Next.js build and `prisma migrate deploy` before or at startup against the production database.

## License

Private.
