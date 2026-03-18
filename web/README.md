# EPA Smart Health Data Mapping (START HACK 2026)

AI-powered healthcare data harmonization prototype built with:

- Next.js (App Router + TypeScript)
- Hosted Postgres (Neon/Supabase)
- Anthropic API integration (with fallback mode)
- No authentication (hackathon demo mode)

## 5-minute local start (no Docker)

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
Copy-Item .env.example .env.local
```

3. Add values in `.env.local`:

- `DATABASE_URL` (hosted Postgres connection string)
- `ANTHROPIC_API_KEY`
- optional `ANTHROPIC_MODEL` (default: `claude-4-5-haiku-latest`)

4. Initialize schema and seed data:

```bash
npm run db:init
npm run seed
```

5. Run app:

```bash
npm run dev
```

Open http://localhost:3000

## Vercel deployment

1. Push `/web` as your Vercel project root.
2. Add environment variables in Vercel:
	- `DATABASE_URL`
	- `ANTHROPIC_API_KEY`
	- `ANTHROPIC_MODEL` (optional)
3. Deploy.
4. Trigger ingestion/transform from Overview page buttons.

## API routes

- `POST /api/ingest/[dataset]`
- `POST /api/transform/run`
- `GET /api/mapping/suggestions`
- `POST /api/mapping/decision`
- `GET /api/quality/summary`
- `GET /api/quality/issues`
- `GET /api/alerts`
- `GET /api/cases/[caseId]/timeline`
- `POST /api/ai/explain-alert/[alertId]`
- `GET /api/health`

## Data rules implemented

- Missing mandatory IDs (`case_id`, `patient_id`) => row dropped
- `case_id` normalization: `CASE-0135`, `0135`, `135` => `135`
- Null token normalization: `NULL`, `Missing`, `unknow`, `NaN`, `N/A`, blank => `null`
- `epaAC-Data-1` duplicate logic by `IID`: keep last occurrence
- Source lineage kept (`source_file`, `row_number`, `row_hash`, timestamps)

## Test & lint

```bash
npm run lint
npm run test
```

