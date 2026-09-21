# Agent Guide

> **Read [CONTEXT.md](./CONTEXT.md) first — then start building.** It is the
> committed repo map: the complete file inventory, the design tokens, every
> component's API, the database schema, the installed dependencies, and the
> first-prompt plan, all pre-computed. Together with this file it replaces the
> exploration pass — you don't need to glob the tree or read `package.json`,
> `styles.css`, `schema.ts`, `__root.tsx`, the `ui/` components, or the auth
> files to get oriented. Open a file when you're about to change it.

Full-stack TanStack Start app with auth, Postgres, background jobs, and
realtime WebSockets pre-wired, built on Tailwind + shadcn/ui. This codebase
starts as a **launchpad**: all infrastructure is wired and working, nothing is
app-specific yet. Every core pattern has exactly one canonical example —
either live in the kit or as a complete recipe in `docs/recipes/` — and you
extend the app by copying it.

## Making it yours (first-prompt checklist)

When building a new app on this launchpad, do this before anything else:

1. Set the app's name and description in `src/lib/app.ts` — it drives the
   document title, the header brand, and the auth pages. It ships as the
   placeholder "Work In Progress", which the user can see in their live preview,
   so rename it first. Match `public/manifest.json`'s `short_name`/`name`
   to it.
2. Set the look and feel by editing the design tokens in `src/styles.css` —
   the one file that re-themes the whole app (see CONTEXT.md §4).
3. Replace `src/routes/index.tsx` with the app's real home page. It currently
   renders a "your app is being built" placeholder that the user is watching
   in a live preview, so replace it early. The landing page IS the app — don't
   build a separate "welcome" screen.
4. Build the first feature — usually `docs/recipes/crud.md`.
5. Make authenticated states easy to test. Keep the default development user,
   then seed at least a populated primary user and an alternate user; add one
   user per permission role when the app has roles. Add a compact **Test
   accounts** panel to `/login`, gated by `import.meta.env.DEV`, with clearly
   labelled one-click buttons that use the normal `authClient.signIn.email`
   flow. This must never be an auth bypass or appear in production.
6. Add realistic, idempotent demo records to `seedNonProductionData` in
   `src/scripts/seed-app-data.ts`, owned by those test users, then run
   `npm run db:seed`. Add only required reference data to
   `seedProductionData`; it is empty by default.

CONTEXT.md §1 has the same checklist with the exact files and commands.

## Stack

| Concern         | Choice                                                | Where                                        |
| --------------- | ----------------------------------------------------- | -------------------------------------------- |
| Framework       | TanStack Start (React 19, SSR, Vite)                  | `src/routes/`, `vite.config.ts`              |
| Routing         | TanStack Router, file-based                           | `src/routes/`                                |
| Auth            | better-auth (email + password), sessions in Postgres  | `src/lib/auth*.ts`, `src/routes/login.tsx`   |
| Server RPC      | Server functions (`createServerFn`)                   | `src/functions/`                             |
| HTTP endpoints  | Server routes (`server.handlers`)                     | `src/routes/api/health.ts`                   |
| Client data     | TanStack Query + route loaders                        | `src/routes/`                                |
| Forms           | TanStack Form + Zod 4, pre-styled fields              | `src/components/form.tsx`                    |
| Database        | Postgres + Drizzle ORM, SQL migrations                | `src/db/`, `drizzle/`                        |
| Background jobs | pg-boss (queues live in Postgres)                     | `src/jobs/`                                  |
| Realtime        | WebSockets — standalone `ws` process                  | `src/ws/server.ts`                           |
| UI components   | shadcn/ui, 26 components vendored into the repo       | `src/components/ui/`                         |
| Styling         | Tailwind CSS v4, shadcn tokens, dark mode via `.dark` | `src/styles.css`, `src/components/theme.tsx` |
| Toasts          | sonner (`toast.success(…)` / `toast.error(…)`)        | mounted in `src/routes/__root.tsx`           |
| Lint/format     | ESLint + Prettier                                     | `eslint.config.js`, `prettier.config.js`     |

## Commands

```bash
npm run dev         # web app on :3000 (Vite + TanStack Start)
npm run ws          # realtime WebSocket server on :3001 (separate process)
npm run worker      # background job worker (separate process)
npm run db:generate # generate a SQL migration from schema.ts changes
npm run db:migrate  # apply pending migrations
npm run db:seed     # environment-aware, idempotent app data
npm run db:studio   # Drizzle Studio (database browser)
npm run check       # prettier + typecheck + lint + tests — run before done
npm run test        # vitest only
npm run build       # production build
npm start           # built production web server
npm run start:ws     # built production WebSocket server
npm run start:worker # built production background worker
```

For deployment, follow [DEPLOYMENT.md](./DEPLOYMENT.md). Keep the Dockerfile
and production smoke check working when changing runtime dependencies or
startup behavior. Never seed development data in production.

`DATABASE_URL` must point at Postgres (see `.env.example`). On gently the web
process, the ws server, the worker, the database, env injection, and the seed
are all declared by the externally managed Gently template runtime config.

## Auth & user data — the most important rule

Auth works out of the box: sign-up/sign-in pages, sessions, and a seeded dev
account (`dev@example.com` / `password1234`). The root route puts the session
into router context, so every route can read `context.session`.

For every authenticated app, make the important signed-in states directly
reachable by humans and browser agents. Seed deterministic non-production test
users for the meaningful roles/scenarios (at minimum a populated primary user
and an alternate user for data-isolation checks), and show them as one-click
options on `/login` only under `import.meta.env.DEV`. The buttons must use the
ordinary Better Auth email/password sign-in, then invalidate the router and
follow the normal redirect. Never add a special session endpoint, hard-coded
cookie, authorization bypass, production test user, or production-visible test
credentials. During browser verification, use these identities to check the
main flow, ownership isolation, and each role-specific path.

**Every server function that reads or writes user-owned data must call
`requireUser()` (from `src/lib/auth-server.ts`) first and filter every query
by `user.id`.** No exceptions — route guards protect pages, not data; the
server function is the security boundary. The canonical shape:

```ts
export const listPosts = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  return db.select().from(posts).where(eq(posts.userId, user.id))
})
```

- User-owned tables reference `user.id` (`userId: text('user_id').notNull()
.references(() => user.id, { onDelete: 'cascade' })`).
- Protected PAGES live under the pathless layout `src/routes/_authed.tsx`
  (create it with your first protected page — `docs/recipes/crud.md` shows it;
  it redirects to `/login` when signed out).
- After `authClient.signIn/signUp/signOut(…)` calls, run
  `router.invalidate()` so the session in context refreshes.

## Core rules

- **Pages are files** under `src/routes/`. `posts.tsx` → `/posts`,
  `_authed.posts.$postId.tsx` → protected `/posts/:postId`, `api/health.ts` →
  `/api/health`. After adding/renaming a route file run
  `npm run generate-routes` (or let the dev server do it); never edit
  `src/routeTree.gen.ts` by hand. Add a nav link in
  `src/components/Header.tsx`.
- **Client↔server calls use server functions** (`createServerFn` in
  `src/functions/`), never hand-rolled fetch + JSON endpoints. Validate input
  with `.validator(zodSchema)` — pass the Zod schema directly, and share the
  same schema with the form. Server routes (`server.handlers`) are only for
  endpoints called from OUTSIDE the app (webhooks, health checks) or raw
  HTTP/binary (file uploads).
- **Schema is the source of truth, migrations are the history.** Change
  `src/db/schema.ts`, then `npm run db:generate` + `npm run db:migrate`, and
  commit the generated files in `drizzle/`. Don't hand-write SQL migrations;
  don't use `db:push`. Share row types via `import type { Post } from
'../db/schema'`. Never remove the auth tables.
- **Forms use `useAppForm`** from `src/components/form.tsx` — one Zod schema
  in `validators.onSubmit` (the same one the server function validates),
  pre-styled `field.TextField` / `field.TextareaField` / `field.CheckboxField`
  and `form.SubmitButton`. `src/routes/login.tsx` is the live example;
  `docs/recipes/forms.md` has the full pattern.
- **Load the official shadcn skill before UI work:**
  `.agents/skills/shadcn/SKILL.md`. Use it to inspect installed components,
  search the registry, read current component docs, and compose or add
  components instead of hand-building equivalents. Prefer the vendored
  components in `src/components/ui/`, plus `PageHeader` and `EmptyState` from
  `src/components/`. An MCP server is optional; the skill's project-aware CLI
  workflow works without one.
- **The starter's form abstraction wins over generic skill examples.** Keep
  using `useAppForm` and its field components from `src/components/form.tsx`;
  do not replace it with raw shadcn `FieldGroup` composition. Project-specific
  rules in this file and `CONTEXT.md` take precedence over generic skill
  examples.
- **Server-only code never reaches the client.** `src/db`, `src/jobs`,
  `src/ws`, and `src/lib/auth.ts` may only be imported from server function
  handlers, server routes, or the standalone processes — never directly from
  components (`import type` is fine). Only `createServerFn` handler bodies
  are stripped from the client bundle automatically — a plain exported helper
  that touches those modules must be wrapped in `createServerOnlyFn` (see
  `requireUser` in `src/lib/auth-server.ts`), or it drags Postgres into the
  browser and crashes hydration.
- **Every mutation handles failure**: `toast.error(...)` on error,
  `toast.success(...)` + `router.invalidate()` on success. Route-level
  failures render the root `errorComponent`/`notFoundComponent` (already
  wired in `__root.tsx`) — throw, don't swallow.
- Lint gotcha: `@typescript-eslint/no-unnecessary-condition` rejects
  `const [row] = await db.select()…; if (!row)` (Drizzle rows aren't typed
  `| undefined`). Check `rows.length === 0` before destructuring instead —
  see `src/scripts/seed.ts`.
- Run `npm run check` before considering a change done.

## How to add things

Live canonical examples in the kit:

| Pattern            | Copy from                                        |
| ------------------ | ------------------------------------------------ |
| Form page          | `src/routes/login.tsx`                           |
| Server route (raw) | `src/routes/api/health.ts`                       |
| Head/meta per page | `seo()` in any route's `head` (`src/lib/seo.ts`) |
| Schema test        | `src/lib/auth-schemas.test.ts`                   |
| Component test     | `src/components/form.test.tsx`                   |

Complete recipes (full files, verified — follow them step by step):

| I need to…                                   | Recipe                            |
| -------------------------------------------- | --------------------------------- |
| Add a collection users create/edit/delete    | `docs/recipes/crud.md`            |
| Build any form                               | `docs/recipes/forms.md`           |
| Run slow/retryable work off the request path | `docs/recipes/background-jobs.md` |
| Push live updates to open pages              | `docs/recipes/realtime.md`        |
| Accept file/image uploads                    | `docs/recipes/file-uploads.md`    |
| Send email                                   | `docs/recipes/email.md`           |
| Set titles/descriptions/social cards         | `docs/recipes/seo.md`             |

## Design bar

The user never sees code — only the pages. Make them look deliberate:

- Use the semantic token classes (`bg-background`, `text-muted-foreground`,
  `border`, `bg-accent`) exclusively; never hardcoded hex colors. Both themes
  must look right — there's a visible dark-mode toggle in the header.
- Every list has an `EmptyState` (with the create action), every page starts
  with `PageHeader`, loading uses `Skeleton` components — no blank screens,
  no bare "no data" text, no layout jumps.
- Destructive actions get an `AlertDialog` confirm. Async buttons show their
  pending state (SubmitButton does this for you).
- Prefer restraint: the shadcn defaults, the existing spacing and type scales,
  and `gap-*` for layout spacing. Don't invent new visual styles per page.

## Testing

Vitest is wired (`npm run test`). Two canonical examples to copy:
`src/lib/auth-schemas.test.ts` (pure function / Zod schema test) and
`src/components/form.test.tsx` (component test — note the
`// @vitest-environment jsdom` pragma). Test what breaks silently: schema
edge cases, scoping/permission logic, tricky pure functions. Don't chase
coverage on page components.

## Environment

- `.env` (gitignored) for local dev; `.env.example` documents every key. Only
  `DATABASE_URL` and `BETTER_AUTH_SECRET` matter out of the box. The web
  process loads `.env` via Vite; worker and ws load it via
  `src/server/load-env.ts`. On Gently, env comes from the template runtime config
  (services' `connectionEnv` + the `env:` block) and the `.env` files are a
  harmless no-op.
- Secrets stay server-side. Only `VITE_`-prefixed variables reach the browser
  (`import.meta.env.VITE_*`). New third-party keys: add to `.env.example`
  (documented), `.env` (local value), and the Gently template runtime `env:`
  block (sandbox value).
- `npm run db:seed` dispatches on `NODE_ENV`. Production runs only
  `seedProductionData`; every other value creates the development account and
  runs `seedNonProductionData`. Both app-data hooks start as safe no-ops.
- Set `BETTER_AUTH_URL` to the canonical public origin in production. If the
  app is served from multiple approved domains, also set the comma-separated
  `BETTER_AUTH_ALLOWED_HOSTS`; Better Auth resolves each request against that
  allowlist. This does not share cookies across unrelated domains.
