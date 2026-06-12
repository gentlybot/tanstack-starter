# TanStack Starter

A full-stack [TanStack Start](https://tanstack.com/start) starter kit with the
pieces real apps grow into already wired together:

- **TanStack Start** — React 19, SSR, file-based routing, type-safe server functions
- **TanStack Query** — client data fetching and cache, integrated with the router
- **Postgres + Drizzle ORM** — typed schema in `src/db/schema.ts`
- **Background jobs** — [pg-boss](https://github.com/timgit/pg-boss) queues stored in the same Postgres; no Redis needed
- **AI chat** — streaming chat with tool calling via [TanStack AI](https://tanstack.com/ai) (`/chat`)
- **Tailwind CSS v4 + shadcn** — utility styling with a small token-based design system
- **Biome** — lint + format
- **TanStack Intent** — agent skills in `AGENTS.md` so AI coding agents use the stack correctly

The `/tasks` page demonstrates the full loop: a server function inserts a row
and enqueues a job, the worker processes it, and the UI polls with TanStack
Query until it's done.

## Getting started

You need Node 22+ and a Postgres database.

```bash
# 1. Postgres (any way you like; docker shown)
docker run -d --name starter-pg -p 5432:5432 \
  -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app \
  postgres:17-alpine

# 2. Configure
cp .env.example .env.local

# 3. Install, sync schema, run
npm install
npm run db:push
npm run dev        # web app → http://localhost:3000
npm run worker     # in a second terminal — processes background jobs
```

To enable the AI chat at `/chat`, set `ANTHROPIC_API_KEY` (or
`OPENAI_API_KEY`) in `.env.local` and restart.

### Running on gently

`gently/apps.yml` declares everything a gently workspace needs: the Node
toolchain, the Postgres service (which injects `DATABASE_URL`), and both
processes (`web` + `worker`). Create a project from this template and it runs
with no extra setup; add API keys as workspace secrets.

## Project structure

```
src/
  routes/            file-based routes (pages + API endpoints)
    index.tsx          /            landing page
    tasks.tsx          /tasks       db + jobs + query demo
    chat.tsx           /chat        AI chat UI
    api.chat.ts        /api/chat    streaming chat endpoint
  db/
    schema.ts          Drizzle schema — single source of truth
    index.ts           db client
  jobs/
    queues.ts          queue names + payload types
    handlers/          one file per job
    worker.ts          worker entry (npm run worker)
    boss.ts            pg-boss setup, enqueue() + work() helpers
  lib/
    chat-tools.ts      tools the chat assistant can call
  components/          shared UI
gently/apps.yml      gently workspace runtime config
AGENTS.md            guide + skill mappings for AI coding agents
```

## Common tasks

| Task | How |
| --- | --- |
| Add a page | New file in `src/routes/`, link it from `Header.tsx` |
| Add a table | Edit `src/db/schema.ts`, run `npm run db:push` |
| Add a background job | Queue in `src/jobs/queues.ts`, handler in `src/jobs/handlers/`, register in `worker.ts` |
| Add a chat tool | `toolDefinition` in `src/lib/chat-tools.ts`, wire into `api.chat.ts` |
| Add UI components | `npx shadcn@latest add button` |
| Add a TanStack add-on | `npx @tanstack/cli add <add-on>` (auth, forms, tables, …) |

See `AGENTS.md` for the conventions this codebase follows — useful for humans
and required reading for AI agents.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | dev server on port 3000 |
| `npm run worker` | background job worker (watch mode) |
| `npm run db:push` | sync schema to the database |
| `npm run db:studio` | Drizzle Studio (database browser) |
| `npm run check` | Biome lint + format |
| `npm run test` | Vitest |
| `npm run build` / `npm run preview` | production build / preview |
