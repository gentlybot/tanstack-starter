# TanStack Starter

A full-stack [TanStack Start](https://tanstack.com/start) starter kit with the
pieces real apps grow into already wired together:

- **TanStack Start** — React 19, SSR, file-based routing, server functions
- **TanStack Query** — client data fetching, caching, and polling
- **Postgres + Drizzle ORM** — typed schema in `src/db/schema.ts` with real SQL
  migrations in `drizzle/` (including an example of a later schema change)
- **Background jobs** — [pg-boss](https://github.com/timgit/pg-boss) queues
  stored in the same Postgres; no Redis needed
- **Realtime** — WebSockets via a small standalone `ws` process; a live chat
  room with presence, proxied same-origin at `/ws`
- **Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)** — vendored,
  accessible components with light/dark mode
- **ESLint + Prettier**, **Vitest**
- **AGENTS.md** — conventions so AI coding agents use the stack correctly

The `/tasks` page demonstrates the full loop: a server function inserts a row
and enqueues a job, the worker processes it, and the page polls until it's
done. The `/chat` page adds a realtime layer: messages broadcast over a
WebSocket to every open tab and are saved to Postgres so history survives a
reload.

## Getting started

You need Node 22+ and a Postgres database.

```bash
# 1. Postgres (any way you like; docker shown)
docker run -d --name tanstack-starter-pg -p 5432:5432 \
  -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app \
  postgres:17-alpine

# 2. Configure
cp .env.example .env

# 3. Install, migrate, run
npm install
npm run db:migrate
npm run dev        # web app → http://localhost:3000
npm run ws         # in a second terminal — realtime WebSocket server
npm run worker     # in a third terminal — processes background jobs
```

The only required env var is `DATABASE_URL` (see `.env.example`).

### Running on gently

`gently/apps.yml` declares everything a gently workspace needs: the Node
toolchain, the Postgres service (which injects `DATABASE_URL`), and all three
processes (`web` + `ws` + `worker`). Create a project from this template and
it runs with no extra setup.

## Project structure

```
src/
  routes/                  file-based routes (pages AND endpoints)
    __root.tsx               document shell + layout (header, main)
    index.tsx                /         landing page
    tasks.tsx                /tasks    db + jobs + polling demo
    chat.tsx                 /chat     realtime WebSocket chat demo
    about.tsx                /about    the stack at a glance
    api/health.ts            GET /api/health — a raw server route
  functions/
    tasks.ts                 server functions (typed client↔server RPC)
  components/
    Header.tsx               nav
    ChatRoom.tsx             WebSocket chat client
    ui/                      shadcn/ui components (vendored — edit freely)
  db/
    schema.ts                Drizzle schema — single source of truth
    index.ts                 shared db client (web + worker + ws)
  jobs/
    queues.ts                queue names + payload types
    handlers/                one file per job
    worker.ts                worker entry (npm run worker)
    boss.ts                  pg-boss setup, enqueue() + work() helpers
  ws/
    server.ts                standalone WebSocket server (npm run ws)
  server/load-env.ts         dotenv for the standalone processes
drizzle/                   generated SQL migrations — committed
gently/apps.yml            gently workspace runtime config
AGENTS.md                  conventions for humans and AI agents
drizzle.config.ts          drizzle-kit config (points at src/db/schema.ts)
```

## Why a standalone WebSocket process?

TanStack Start has no built-in WebSocket support, so realtime runs as its own
small Node process (`src/ws/server.ts`) — the same pattern as the background
worker. Clients always connect **same-origin at `/ws`**: in dev, Vite proxies
it (see `vite.config.ts`); on gently, `gently/apps.yml` wires it; anywhere
else, point your reverse proxy's `/ws` at the ws port. This survives framework
churn and scales independently of the web server.

## Common tasks

| Task                  | How                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------- |
| Add a page            | New file in `src/routes/`, link it from `src/components/Header.tsx`                     |
| Add a server function | Add to `src/functions/`, call it from components via TanStack Query                     |
| Change the schema     | Edit `src/db/schema.ts`, `npm run db:generate`, `npm run db:migrate`, commit `drizzle/` |
| Add a background job  | Queue in `src/jobs/queues.ts`, handler in `src/jobs/handlers/`, register in `worker.ts` |
| Add a realtime event  | Extend the JSON protocol in `src/ws/server.ts` + `ChatRoom.tsx`                         |
| Add a UI component    | `npx shadcn@latest add <name>`                                                          |

See `AGENTS.md` for the conventions this codebase follows — useful for humans
and required reading for AI agents.

## Scripts

| Script                               | What it does                                 |
| ------------------------------------ | -------------------------------------------- |
| `npm run dev`                        | web app on port 3000                         |
| `npm run ws`                         | realtime WebSocket server on port 3001       |
| `npm run worker`                     | background job worker (watch mode)           |
| `npm run db:generate`                | generate a SQL migration from schema changes |
| `npm run db:migrate`                 | apply pending migrations                     |
| `npm run db:studio`                  | Drizzle Studio (database browser)            |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit`                      |
| `npm run test`                       | Vitest                                       |
| `npm run build` / `npm run preview`  | production build / preview                   |
