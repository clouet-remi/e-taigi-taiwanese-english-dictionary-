# E-Taigi

> Taiwanese–English dictionary with Hanzi search, romanization, and audio playback.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Frontend on Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com/)
[![API on Render](https://img.shields.io/badge/API-Render-46E3B7?logo=render&logoColor=white)](https://render.com/)

**[Live demo → https://e-taigi-taiwanese-english-dictionar.vercel.app](https://e-taigi-taiwanese-english-dictionar.vercel.app)**

> The API runs on Render's free tier and may take **20–30 seconds** to respond after a period of inactivity (cold start). The first search after a long idle period may be slow — subsequent ones are instant.

---

A full-stack dictionary application for the Taiwanese language, backed by **36,800 lexical entries** including romanization (POJ/KIP) and audio pronunciations. Built as both a practical language-learning tool and a demonstration of deliberate full-stack architecture decisions.

## Features

- **Dual search modes** — detects Hanzi and English input automatically, routing each to a dedicated SQL search path
- **Ranked results** — exact → prefix → substring ordering implemented in raw SQL for full transparency and control
- **Detail modal** — romanization (POJ/KIP) and native browser audio player per entry
- **Debounced search** — 250 ms debounce keeps the experience responsive without unnecessary API calls
- **Rate limiting** — in-memory per-IP rate limiter with standard `X-RateLimit-*` headers
- **Security headers** — `helmet` middleware on the API layer

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, App Router, vanilla CSS |
| Backend | Express 5, TypeScript |
| ORM | Prisma 6 |
| Database | PostgreSQL (Neon) |
| Validation | Zod |
| Deployment | Vercel (frontend + API as serverless functions) |

## Architecture

```
.
├── apps/
│   ├── api/       # Express REST API — serverless entry via src/handler.ts
│   ├── client/    # Next.js frontend
│   └── src/       # local dev orchestrator (starts both apps together)
└── data/
    └── data.json  # source dictionary dataset (MKDict)
```

### API surface

```
GET /api/health
GET /api/search?q=<query>&limit=<1-50>
```

The API layer is intentionally minimal. Search logic lives in raw SQL via Prisma tagged template literals, which keeps ranking rules explicit, easy to read, and easy to evolve without introducing an external search engine.

### Search design

For **Hanzi** queries the API searches `HoaBun` with `LIKE` and ranks results:

1. Exact match
2. Prefix match
3. Substring match → then by string length, then lexically

For **English** queries the input is first normalized (lowercased, diacritics stripped, punctuation cleaned) before the same three-tier ranking is applied against `LOWER(EngBun)`.

### Frontend

The client is a single-page shell: a search box, a live result list, and a detail modal. State is entirely local to `SearchClient` — no global state library. The `Header` component dispatches a custom event to reset search on logo click when already on the home route.

## Local Development

### Requirements

- Node.js 20+
- npm 10+
- A [Neon](https://neon.tech/) PostgreSQL database (free tier works)

### 1 — API

```bash
cd apps/api
npm install
cp .env.example .env   # fill in DATABASE_URL and DIRECT_URL (see below)
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`.env` variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.eu-west-2.aws.neon.tech/neondb?sslmode=require"
PORT=4000
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

> `DATABASE_URL` must point to the **pooler** endpoint (contains `-pooler`).  
> `DIRECT_URL` must point to the **direct** endpoint (no `-pooler`).

### 2 — Client

```bash
cd apps/client
npm install
cp .env.example .env.local
```

`.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### 3 — Run full stack

```bash
cd apps
npm install
cp .env.example .env   # API_PORT=4000, CLIENT_PORT=3000
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |

## Scripts

### `apps/api`

| Command | Description |
|---|---|
| `npm run dev` | Start API with `tsx` (hot reload) |
| `npm test` | Run test suite |
| `npm run typecheck` | TypeScript type check |
| `npm run build` | Bundle for Vercel (`prisma generate` + `esbuild`) |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run migrations (dev) |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run prisma:seed` | Seed database from `data/data.json` |

### `apps/client`

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type check |

## Deployment

The frontend and API are deployed separately.

**API — Render (Web Service)**

| Field | Value |
|---|---|
| Root Directory | `apps/api` |
| Build Command | `npm install && npx prisma generate` |
| Start Command | `npx tsx src/index.ts` |

Required environment variables: `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN` (Vercel frontend URL), `TRUST_PROXY=true`, `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`

> The free tier sleeps after 15 minutes of inactivity — first request after idle takes ~20–30 s.

**Client — Vercel**

Standard Next.js deployment. Set Root Directory to `apps/client`.

Required environment variable: `NEXT_PUBLIC_API_BASE_URL` (Render API URL, Production environment)

## Data

The dataset is derived from the [MKDict project](https://github.com/mknaw/mkdict) and contains 36,800 entries. Of those, 36,204 include an audio URL pointing to pronunciation recordings.

This project is non-commercial. Data is used for educational and language-learning purposes.

## Roadmap

### v1.x — Data & polish

- Continue improving and correcting the underlying lexical dataset
- Refine search ranking and edge case handling

### v2 — User platform

- **User accounts** — authentication with session management and profile persistence
- **Vocabulary lists** — create, organize, and review personal word collections
- **Flashcard system** — spaced-repetition review built on top of saved lists
- **Mobile application** — React Native app sharing the same API layer
- **Offline support** — cached vocabulary lists accessible without internet
