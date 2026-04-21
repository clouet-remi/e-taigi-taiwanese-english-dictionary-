# E-Taigi

E-Taigi is a Taiwanese-to-English dictionary web application focused on discoverability, speed, and clarity. It turns a large lexical dataset into a lightweight full-stack product with a clean search experience, a dedicated API layer, and built-in support for romanization and audio playback.

The project is built with Next.js, Express, Prisma, and PostgreSQL, and is designed as both a useful language-learning tool and a strong full-stack portfolio project with clear architectural choices. The target deployment stack is Neon for the database and Vercel for the application layer.

## Highlights

- Search Taiwanese vocabulary by Hanzi or English meaning
- Fast single-page search flow with debounced requests
- Detail modal with romanization and audio when available
- SQL-backed ranking logic for predictable and maintainable search behavior
- Full local stack runnable from a single command

## Product Overview

The application is centered around one core interaction: type a query, retrieve relevant vocabulary entries quickly, and inspect the result in a clean, focused interface.

On the frontend, users can search by Hanzi or English meaning, browse result cards, and open an entry modal to view romanization and play audio where the source dataset provides it.

On the backend, the API keeps the search layer explicit and deterministic. Instead of relying on an external search service, the project uses raw SQL through Prisma to implement ranking rules that are easy to understand, test, and evolve.

## Core Features

### Search-first interface

The UI is intentionally minimal and centered on search. Input is debounced before hitting the API, keeping the experience responsive while avoiding unnecessary requests.

### Dual query modes

The API detects whether a query should be treated as Hanzi or English and routes it to the appropriate SQL search path.

### Romanization and audio

Each entry can expose POJ and KIP-related fields, and when an audio source is present in the dataset, the detail modal provides a native browser audio player.

### Local developer experience

The `apps` workspace includes a small orchestrator that starts both the API and the frontend together, resolves ports, and injects the correct API base URL for the client during development.

## Architecture

### Frontend

- Next.js 16
- React 19
- App Router
- Client-side search state with debounced API calls

The frontend lives in `apps/client` and provides the user-facing experience: homepage shell, search box, result list, and vocabulary modal.

### Backend

- Express 5
- Prisma ORM
- PostgreSQL
- Zod validation

The backend lives in `apps/api` and exposes a deliberately small HTTP surface:

- `GET /api/health`
- `GET /api/search?q=...&limit=...`

It also includes:

- CORS handling for local development
- `helmet` security headers
- lightweight in-memory rate limiting
- centralized error handling

### Data model

The `DictWord` table is optimized for read-heavy dictionary use cases and stores:

- Hanzi (`HoaBun`)
- English definition (`EngBun`)
- POJ and KIP fields
- optional audio URL

The database is seeded from `data/data.json`, which currently contains 36,800 entries, including 36,204 entries with an audio source.

## Search Design

One of the most important engineering decisions in this project is to keep search SQL-backed.

For this scope, that choice brings several advantages:

- no external search infrastructure to operate
- ranking rules stay transparent and easy to maintain
- deployment remains lightweight
- the code reflects the domain logic directly

Search is implemented with raw SQL through Prisma for precise control over matching and ordering.

### Hanzi search

For Hanzi queries, the API searches `HoaBun` using `LIKE` and ranks results in this order:

1. exact match
2. prefix match
3. substring match

Results are then refined by shorter string length and lexical ordering, which helps surface the most relevant entries first.

### English search

For English queries, the API first normalizes input through:

- lowercasing
- diacritic removal
- punctuation cleanup
- whitespace normalization

It then searches `LOWER(EngBun)` with the same ranking model:

1. exact match
2. prefix match
3. substring match

This gives the project a practical middle ground between simplicity and quality, without introducing the complexity of a dedicated full-text search engine.

## Project Structure

```text
.
|-- apps/
|   |-- api/      # Express + Prisma + PostgreSQL API
|   |-- client/   # Next.js frontend
|   `-- src/      # local dev orchestrator
|-- data/
|   `-- data.json # source dictionary dataset
```

## Local Development

### Requirements

- Node.js 20+
- npm 10+

### API setup

```bash
cd apps/api
npm install
copy .env.example .env
```

Fill the API environment file with your Neon connection strings:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-west-3.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.eu-west-3.aws.neon.tech/neondb?sslmode=require"
```

Then run:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Client setup

```bash
cd apps/client
npm install
copy .env.example .env.local
```

### Run the full stack

```bash
cd apps
npm install
copy .env.example .env
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`

## Scripts

### `apps`

- `npm run dev`
- `npm run dev:fullstack`

### `apps/api`

- `npm run dev`
- `npm test`
- `npm run typecheck`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run prisma:seed`
- `npm run audio:download`

### `apps/client`

- `npm run dev`
- `npm run build`
- `npm test`
- `npm run typecheck`

## Quality

- TypeScript across frontend and backend
- API tests with Node's built-in test runner
- frontend utility tests

## Deployment Notes

- Database: Neon PostgreSQL
- Frontend: Vercel
- API: Vercel
- Prisma uses a pooled runtime connection via `DATABASE_URL` and a direct administrative connection via `DIRECT_URL`

## Current Limitations

- Some dictionary entries are still imperfect or partially inaccurate. Data quality will be improved progressively over time.
- Audio availability depends on the source URL present in the dataset.
- This project is non-commercial and currently uses source data derived from the MKDict project.

## Roadmap

- Continue improving and correcting the underlying lexical dataset
- Add user accounts
- Let users build and manage personal vocabulary lists
