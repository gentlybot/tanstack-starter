# TanStack Starter — Agent Guide

Full-stack TanStack Start app with Postgres, background jobs, and realtime
WebSockets pre-wired, built on Tailwind + shadcn/ui. Every core pattern is
demonstrated exactly once; extend by copying the existing example of whatever
you're adding.

## Stack

| Concern         | Choice                                                | Where                                             |
| --------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Framework       | TanStack Start (React 19, SSR, Vite)                  | `src/routes/`, `vite.config.ts`                   |
| Routing         | TanStack Router, file-based                           | `src/routes/`                                     |
| Server RPC      | Server functions (`createServerFn`)                   | `src/functions/tasks.ts`                          |
| HTTP endpoints  | Server routes (`server.handlers`)                     | `src/routes/api/health.ts`                        |
| Client data     | TanStack Query                                        | `src/routes/tasks.tsx`                            |
| Database        | Postgres + Drizzle ORM, SQL migrations                | `src/db/`, `drizzle/`                             |
| Background jobs | pg-boss (queues live in Postgres)                     | `src/jobs/`                                       |
| Realtime        | WebSockets — standalone `ws` process                  | `src/ws/server.ts`, `src/components/ChatRoom.tsx` |
| UI components   | shadcn/ui (vendored into the repo)                    | `src/components/ui/`                              |
| Styling         | Tailwind CSS v4, shadcn tokens, dark mode via `.dark` | `src/styles.css`                                  |
| Lint/format     | ESLint + Prettier                                     | `eslint.config.js`, `prettier.config.js`          |

## Commands

```bash
npm run dev        # web app on :3000 (Vite + TanStack Start)
npm run ws         # realtime WebSocket server on :3001 (separate process)
npm run worker     # background job worker (separate process)
npm run db:generate # generate a SQL migration from schema.ts changes
npm run db:migrate  # apply pending migrations
npm run db:studio   # Drizzle Studio (database browser)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # vitest
npm run build      # production build
```

`DATABASE_URL` must point at Postgres (see `.env.example`). On gently the web
process, the ws server, the worker, the database, and env injection are all
declared in `gently/apps.yml`.

## Core rules

- **Pages are files** under `src/routes/`. `tasks.tsx` → `/tasks`, `$id.tsx` →
  path param, `api/health.ts` → `/api/health`. After adding/renaming a route
  file the route tree regenerates on dev-server start (or `npm run
generate-routes`); never edit `src/routeTree.gen.ts` by hand. Add a nav link
  in `src/components/Header.tsx`.
- **Client↔server calls use server functions** (`createServerFn` in
  `src/functions/`), not hand-rolled fetch + JSON endpoints. Server function
  implementations are stripped from the client bundle, so importing them from
  components is safe. Wrap them in TanStack Query (`useQuery`/`useMutation`)
  for caching, polling, and invalidation — see `src/routes/tasks.tsx`.
- **Server routes** (a `server.handlers` block in a route file) are only for
  endpoints called from OUTSIDE the app: webhooks, health checks, raw HTTP.
  See `src/routes/api/health.ts`.
- **Schema is the source of truth, migrations are the history.** Change
  `src/db/schema.ts`, then `npm run db:generate` (writes SQL into `drizzle/`)
  and `npm run db:migrate` (applies it). Commit the generated files in
  `drizzle/` — `drizzle/0001_*.sql` is an example of a later schema change.
  Don't hand-write SQL migrations; don't use `db:push` (it bypasses migration
  history). Share row types with the client via
  `import type { Task } from '../db/schema'` — `import type` is erased, so no
  server code leaks into the browser.
- **Build UI from the shadcn/ui components** in `src/components/ui/`
  (`Button`, `Card`, `Input`, `Badge`, …). Add more with
  `npx shadcn@latest add <component>` — they're vendored source files, edit
  them freely. Use the semantic token classes (`bg-background`,
  `text-muted-foreground`, `border`, `bg-accent`) so light and dark mode both
  work — never hardcoded hex colors.
- **Server-only code never reaches the client.** `src/db`, `src/jobs`, and
  `src/ws` must only be imported from server function handlers, server routes,
  or the standalone processes — never directly from components.
- Run `npm run lint` and `npm run typecheck` before considering a change done.

## How to add things (copy the existing example)

- **A page**: new file in `src/routes/`, add a link in
  `src/components/Header.tsx`. Load data with a route `loader` + server
  function (see `src/routes/tasks.tsx`).
- **A server function**: add it to a file in `src/functions/`. Use
  `.validator()` for input and query Postgres via `db` from `src/db`.
- **A table**: add it to `src/db/schema.ts`, export inferred types, run
  `npm run db:generate` then `npm run db:migrate`, and commit the new file in
  `drizzle/`.
- **A background job**: queue name + payload type in `src/jobs/queues.ts`,
  handler in `src/jobs/handlers/`, register it in `src/jobs/worker.ts`, and
  `enqueue()` it from a server function (see `process-task` and
  `src/functions/tasks.ts`). Use a job whenever work is slow, retryable, or
  shouldn't block a request (emails, imports, external APIs).
- **A realtime feature**: extend the event types in `src/ws/server.ts` (add a
  `type` to the JSON protocol) and handle it in the client component (see
  `src/components/ChatRoom.tsx`). Clients always connect same-origin to `/ws`;
  the Vite proxy (dev) or gently/apps.yml routes it to the ws process. Persist
  anything that should survive a reload to Postgres, like the chat does.
- **A shadcn component**: `npx shadcn@latest add <name>`, then import from
  `src/components/ui/`.

## Environment

- `.env` (gitignored) for local dev; `.env.example` documents the keys. Only
  `DATABASE_URL` is required. TanStack Start/Vite loads `.env` for the web
  process; the standalone worker and ws processes load it via
  `src/server/load-env.ts` (dotenv). On gently, env comes from
  `gently/apps.yml` and those files are a harmless no-op.
- Secrets stay server-side. Only `VITE_`-prefixed variables reach the browser
  (`import.meta.env.VITE_*`).
