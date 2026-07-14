# E-Taigi

Taiwanese-English dictionary with Hanzi search, romanization, and audio playback.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

Live demo: https://e-taigi-taiwanese-english-dictionar.vercel.app

E-Taigi is a full-stack dictionary application for Taiwanese, backed by about 36,800 lexical entries with POJ/KIP romanization and pronunciation audio.

## Features

- Dual search modes: Hanzi and English input are detected automatically.
- Ranked results: exact, prefix, then substring matching.
- Detail modal: romanization and native browser audio playback.
- Debounced search: 250 ms debounce on the client.
- Rate limiting: in-memory per-IP limiter on the API.
- Security headers: API protected with `helmet`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, App Router, CSS |
| Backend | Express 5, TypeScript |
| ORM | Prisma 6 |
| Database | PostgreSQL on Neon |
| Validation | Zod |
| Deployment | Vercel for client and API |

## Architecture

```text
.
+-- apps/
|   +-- api/       # Express REST API, serverless entry via src/handler.ts
|   +-- client/    # Next.js frontend
|   +-- scripts/   # project scripts launched from package.json files
+-- data/
    +-- data.json  # source dictionary dataset
```

### API Source Layout

```text
apps/api/src/
+-- app.ts                    # Express app factory
+-- config.ts                 # env parsing and CORS config
+-- db.ts                     # Prisma client
+-- handler.ts                # Vercel serverless export
+-- index.ts                  # local HTTP server
+-- middleware/
|   +-- rate-limit.ts
+-- search/
|   +-- handler.ts
+-- utils/
    +-- audio-url.ts
    +-- error-handler.ts
    +-- search.ts
```

The API has separate entry files on purpose:

- `app.ts` builds and returns the Express app. It registers middleware, routes, and error handling, but does not call `listen()`.
- `index.ts` is only for local development. It loads config, calls `createApp()`, starts the HTTP server, and handles shutdown signals.
- `handler.ts` is only for Vercel. It exports the Express app without starting a server, because Vercel owns the request lifecycle.

`db.ts` currently contains the shared Prisma client. If database code grows, the next clean step would be moving it to a more explicit path such as `src/database/prisma.ts`.

### API Surface

```text
GET /api/health
GET /api/search?q=<query>&limit=<1-50>
```

Search logic uses Prisma raw SQL template literals. Hanzi queries search `HoaBun`; English queries are normalized and search `LOWER("EngBun")`.

## Local Development

### Requirements

- Node.js 20+
- npm 10+
- A Neon PostgreSQL database

### API

```bash
cd apps/api
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Important API env vars:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-west-3.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.eu-west-3.aws.neon.tech/neondb?sslmode=require"
PORT=4000
CORS_ORIGIN="http://localhost:3000,http://localhost:3003"
TRUST_PROXY=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

`DATABASE_URL` must use the Neon pooler host containing `-pooler`.
`DIRECT_URL` must use the direct Neon host without `-pooler`.

### Client

```bash
cd apps/client
npm install
cp .env.example .env.local
npm run dev
```

Client env:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

### Full Stack Launcher

```bash
cd apps
npm install
cp .env.example .env
npm run dev
```

Default ports from `apps/.env.example`:

| Service | URL |
|---|---|
| API | http://localhost:5001 |
| Client | http://localhost:3003 |

The launcher will pick the next available port when the default is busy, unless a port is explicitly set in `apps/.env`.

## Scripts

### `apps`

| Command | Description |
|---|---|
| `npm run dev` | Start API and client together |
| `npm run dev:fullstack` | Alias for `npm run dev` |
| `npm run typecheck` | Typecheck project scripts |

### `apps/api`

| Command | Description |
|---|---|
| `npm run dev` | Start the local API server |
| `npm test` | Run API tests |
| `npm run test:watch` | Run API tests in watch mode |
| `npm run typecheck` | Typecheck API, tests, Prisma seed, and shared scripts |
| `npm run build` | Bundle the Vercel serverless entry |
| `npm run audio:download` | Run `apps/scripts/download-audio-backups.ts` |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run development migrations |
| `npm run prisma:deploy` | Apply production migrations |
| `npm run prisma:seed` | Seed the database |

### `apps/client`

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build the client |
| `npm run start` | Start the production Next.js server |
| `npm test` | Run client tests |
| `npm run typecheck` | Typecheck the client |

## Deployment

The API and client are deployed separately on Vercel.

### API on Vercel

| Field | Value |
|---|---|
| Root Directory | `apps/api` |
| Build Command | `npm run build` |
| Output | `api/index.js` generated by esbuild |

Required env vars:

```env
DATABASE_URL=...
DIRECT_URL=...
CORS_ORIGIN=https://your-client.vercel.app
TRUST_PROXY=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

### Client on Vercel

| Field | Value |
|---|---|
| Root Directory | `apps/client` |
| Build Command | `npm run build` |

Required env var:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api.vercel.app
```

## Data

The dataset is derived from the MKDict project and contains about 36,800 entries. This project is non-commercial and intended for educational and language-learning use.

## Notes

- Generated build artifacts are ignored, including `.next/`, `*.tsbuildinfo`, local databases, and `apps/api/api/index.js`.
- On Windows, Prisma generation can fail with `EPERM` if Node processes are still running. Stop local servers and retry.
