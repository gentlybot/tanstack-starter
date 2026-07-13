# TanStack Launchpad

A full-stack [TanStack Start](https://tanstack.com/start) template built to be
**extended by AI agents**: all the infrastructure a real app needs is wired
and working on first boot, with zero demo content to tear out. Every core
pattern has one canonical, copyable example — live in the kit or as a
complete recipe in `docs/recipes/`.

In the box:

- **TanStack Start** — React 19, SSR, file-based routing, server functions
- **Auth** — [better-auth](https://better-auth.com) email + password, session
  in router context, styled login/signup pages, seeded dev account
- **Postgres + Drizzle ORM** — typed schema, real SQL migrations, idempotent
  seed script
- **Forms** — TanStack Form + Zod 4 with pre-styled field components
- **Background jobs** — [pg-boss](https://github.com/timgit/pg-boss) queues in
  the same Postgres; no Redis needed
- **Realtime** — WebSockets via a small standalone `ws` process, same-origin
  at `/ws`
- **Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)** — 26 vendored
  components, semantic tokens, dark mode with a header toggle, Inter
  (self-hosted)
- **Error/loading UX** — root error + 404 pages, sonner toasts, skeleton/empty
  state primitives
- **Vitest** — wired, with canonical schema + component test examples
- **AGENTS.md** — the agent guide: conventions, the data-scoping rule, a
  "making it yours" checklist, and a recipes index

## Getting started

You need Node 22+ and a Postgres database.

```bash
# 1. Postgres (any way you like; docker shown)
docker run -d --name tanstack-starter-pg -p 5432:5432 \
  -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app \
  postgres:17-alpine

# 2. Configure
cp .env.example .env

# 3. Install, migrate, seed, run
npm install
npm run db:migrate
npm run db:seed        # dev account: dev@example.com / password1234

npm run dev            # web app        → http://localhost:3000
npm run ws             # realtime       → ws process on :3001 (separate terminal)
npm run worker         # background jobs (separate terminal)
```

Sign in with the seeded `dev@example.com` / `password1234`, or create an
account.

## Running on gently

The Gently template's externally managed runtime configuration declares
everything: the Postgres service (with
`DATABASE_URL` injection), the three processes (web / ws / worker), the auth
secret, and setup (`npm install`, migrate, seed). Opening the project in a
gently sandbox boots the full stack with a signed-in-ready app — no manual
steps.

## Project structure

```
src/
  routes/            # file-based pages + server routes (api/…)
  functions/         # server functions (typed client↔server RPC)
  components/        # Header, form fields, PageHeader, EmptyState, theme
  components/ui/     # vendored shadcn/ui components
  db/                # Drizzle client + schema (source of truth)
  jobs/              # pg-boss: queues, worker, handlers
  ws/                # standalone WebSocket server
  lib/               # app identity, auth, seo, utils
  scripts/           # seed
docs/recipes/        # complete, verified patterns to copy (CRUD, forms, …)
drizzle/             # generated SQL migrations (committed)
```

## Extending the app

**Read [AGENTS.md](./AGENTS.md) first** — it's the guide this codebase is
built around: the first-prompt checklist, the auth/data-scoping rule, core
conventions, and a recipe index for CRUD, forms, background jobs, realtime,
uploads, email, and SEO.

## Scripts

| Script                | What it does                               |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Web app on :3000                           |
| `npm run ws`          | WebSocket server on :3001                  |
| `npm run worker`      | Background job worker                      |
| `npm run db:generate` | Generate SQL migration from schema changes |
| `npm run db:migrate`  | Apply pending migrations                   |
| `npm run db:seed`     | Idempotent dev data                        |
| `npm run db:studio`   | Drizzle Studio                             |
| `npm run check`       | prettier + typecheck + lint + tests        |
| `npm run test`        | Vitest                                     |
| `npm run build`       | Production build                           |
