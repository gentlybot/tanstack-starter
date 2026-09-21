# Repo Map — read this instead of exploring

Everything an agent normally discovers by globbing and reading files on its
first prompt, pre-computed and committed. **Read this file and
[AGENTS.md](./AGENTS.md), then start building.** Between them you already have
the full file inventory, the design tokens, every component's API, the
database schema, and the exact first-prompt plan — you do not need to open
`package.json`, `styles.css`, `schema.ts`, `__root.tsx`, the `ui/` components,
or the auth files to get oriented.

Open a file only when you are about to **change** it, or when this map sends
you to it.

This map is kept in sync with the launchpad as shipped. If you have already
modified files, trust the working tree over this document.

---

## 1. First-prompt plan

The user asked for an app. The launchpad is fully wired infrastructure with
zero app content. Do this, in this order — no inspection pass needed:

1. **Name it** — `src/lib/app.ts` (`APP_NAME`, `APP_DESCRIPTION`) and the
   `short_name` / `name` fields in `public/manifest.json`. This drives the
   document title, the header brand, and the auth pages. It currently reads
   **"Work In Progress"**, a placeholder the user can see in their live preview —
   do this first, before anything else.
2. **Set the look and feel** — edit the token values in `src/styles.css`
   (§4). This is the only file that needs to change to re-theme the entire
   app; every component reads the tokens.
3. **Replace the home page** — `src/routes/index.tsx` currently renders a
   "your app is being built" placeholder that the user is watching live.
   Overwrite it with the app's real landing page. The landing page IS the
   app; don't build a separate welcome screen.
4. **Model the data** — add tables to `src/db/schema.ts` under the
   `App tables go below` marker, then run `npm run db:generate` and
   `npm run db:migrate`, and commit the files drizzle writes into `drizzle/`.
5. **Build the first feature** — follow `docs/recipes/crud.md` verbatim. It
   creates `src/routes/_authed.tsx` (the protected layout), the server
   functions, and the list/detail/form pages.
6. **Make authenticated states easy to test** — keep the seeded development
   account and add deterministic non-production users for the app's meaningful
   roles or states. At minimum, provide a populated primary user and an
   alternate user so ownership boundaries can be tested. Add a development-only
   **Test accounts** section to `/login` with clearly labelled one-click buttons
   that call the normal `authClient.signIn.email` flow. Humans and browser agents
   must be able to enter each state without copying credentials. Gate the section
   with `import.meta.env.DEV`; never create a bypass endpoint or expose test
   credentials in a production build.
7. **Seed meaningful state** — add idempotent demo records to
   `seedNonProductionData` in `src/scripts/seed-app-data.ts`, owned by the
   matching test users, then run `npm run db:seed`. Production has a separate,
   empty-by-default `seedProductionData` hook for required reference data only.
8. **Verify** — use the test-account buttons to exercise each role/state and
   data isolation in the browser, then run `npm run check` (prettier +
   typecheck + lint + tests).

Add nav entries to the `links` array in `src/components/Header.tsx` as you add
pages, and seed demo rows in `src/scripts/seed.ts` so a fresh environment is
never empty.

---

## 2. Complete file inventory

Every tracked file. There is nothing else — no hidden config, no generated
source outside `src/routeTree.gen.ts`.

### Root

| File                                                                                            | What it is                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                                                                     | The agent guide: conventions, the data-scoping rule, recipes index. **Read it.**                                                                                                                         |
| `CLAUDE.md`                                                                                     | One line, points at `AGENTS.md`. Nothing else in it.                                                                                                                                                     |
| `CONTEXT.md`                                                                                    | This file.                                                                                                                                                                                               |
| `README.md`                                                                                     | Human-facing setup instructions. Nothing an agent needs.                                                                                                                                                 |
| `package.json`                                                                                  | Scripts in §8; dependency list in §9. No custom fields beyond `imports` (`#/*` → `./src/*`).                                                                                                             |
| `vite.config.ts`                                                                                | React + Tailwind + TanStack Start plugins, `dedupe: ['react','react-dom']`, `/ws` dev proxy → `:3001`, `allowedHosts` from `VITE_ALLOWED_HOSTS`, vitest config (`environment: 'node'`, `globals: true`). |
| `drizzle.config.ts`                                                                             | `schema: ./src/db/schema.ts`, `out: ./drizzle`, dialect postgresql, url from `DATABASE_URL`.                                                                                                             |
| `components.json`                                                                               | shadcn config — style `new-york`, base color `zinc`, icons `lucide`, aliases via `#/`. Needed by `npx shadcn@latest add`.                                                                                |
| `tsconfig.json`, `tsr.config.json`, `eslint.config.js`, `prettier.config.js`, `.prettierignore` | Toolchain defaults. Don't edit.                                                                                                                                                                          |
| `.env.example`                                                                                  | Documents every env var (§10). `.env` is gitignored.                                                                                                                                                     |

### `src/routes/` — pages (file-based routing)

| File            | What it is                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `__root.tsx`    | Document shell + app layout. `beforeLoad` calls `getSession()` and merges it into router context (so any route reads `context.session`). Renders `<Header />` + `<main className="mx-auto max-w-4xl px-4 py-10">`. Also defines `errorComponent` and `notFoundComponent` (already styled — throw, don't swallow). Mounts `ThemeProvider`, `<Toaster />`, devtools. |
| `index.tsx`     | `/` — the placeholder "your app is being built" page. **Replace this.**                                                                                                                                                                                                                                                                                            |
| `login.tsx`     | `/login` — the canonical form page. Copy its shape for any form.                                                                                                                                                                                                                                                                                                   |
| `signup.tsx`    | `/signup` — same shape, uses `signupSchema`.                                                                                                                                                                                                                                                                                                                       |
| `api/health.ts` | `/api/health` — the canonical server route (`server.handlers`) example.                                                                                                                                                                                                                                                                                            |
| `api/auth/$.ts` | better-auth's catch-all handler. Don't touch.                                                                                                                                                                                                                                                                                                                      |

`src/routeTree.gen.ts` is generated — never edit by hand. The dev server
regenerates it; `npm run generate-routes` does it manually.

Naming: `posts.tsx` → `/posts`; `posts.$postId.tsx` → `/posts/:postId`;
`_authed.posts.tsx` → `/posts` behind the pathless `_authed` layout.
`src/routes/_authed.tsx` does not exist yet — `docs/recipes/crud.md` creates it.

### `src/components/`

| File              | What it is                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Header.tsx`      | Sticky site nav. Brand = `APP_NAME`. **`const links: Array<{to,label}> = []`** — add nav entries here. Right side: `<ModeToggle />` then either a `UserMenu` (avatar dropdown with Sign out) or Sign in / Get started buttons. |
| `theme.tsx`       | Exports `ThemeProvider` (next-themes, `attribute="class"`, `defaultTheme="system"`) and `ModeToggle` (light/dark/system dropdown). Dark mode = `.dark` class on `<html>`.                                                      |
| `form.tsx`        | Exports `useAppForm` + form contexts. API in §5.                                                                                                                                                                               |
| `page-header.tsx` | `<PageHeader title description? >{actions}</PageHeader>` — h1 + muted description, actions right-aligned. Start every page with it.                                                                                            |
| `empty-state.tsx` | `<EmptyState icon? title description? >{action}</EmptyState>` — a `Card` with centered icon/title/description. Every empty list gets one.                                                                                      |
| `form.test.tsx`   | Canonical component test (note the `// @vitest-environment jsdom` pragma).                                                                                                                                                     |
| `ui/*`            | 26 vendored shadcn/ui components — inventory in §6. Don't rewrite them; restyle via tokens.                                                                                                                                    |

### `src/lib/`

| File                   | What it is                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `app.ts`               | `APP_NAME`, `APP_DESCRIPTION`. The single rename point.                                                          |
| `auth.ts`              | better-auth server config (email+password, Drizzle adapter). **Server-only.**                                    |
| `auth-server.ts`       | `getSession()` (server fn) and `requireUser()` (server-only). §5.                                                |
| `auth-client.ts`       | better-auth browser client — `authClient.signIn/signUp/signOut`.                                                 |
| `auth-schemas.ts`      | `loginSchema`, `signupSchema` (Zod 4) + inferred types.                                                          |
| `auth-schemas.test.ts` | Canonical pure-function/schema test.                                                                             |
| `seo.ts`               | `seo({title?, description?, image?})` → meta array for a route's `head`. Titles render `"<title> · <APP_NAME>"`. |
| `utils.ts`             | `cn(...)` — clsx + tailwind-merge.                                                                               |

### `src/db/`, `drizzle/`

| File                    | What it is                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/schema.ts`      | Drizzle schema. Contents in §7. **Server-only.**                                                                                        |
| `src/db/index.ts`       | Lazily-created shared Drizzle client, exported as `db` (a Proxy — `DATABASE_URL` is read on first use, not at import). **Server-only.** |
| `drizzle/0000_init.sql` | The only migration so far — creates the four auth tables.                                                                               |
| `drizzle/meta/*`        | drizzle-kit journal + snapshot. Generated; commit them.                                                                                 |

### Server-side processes and glue

| File                                | What it is                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/functions/README.md`           | The `src/functions/` directory is **empty** apart from this README. One file per domain area (`posts.ts`, `settings.ts`) holding `createServerFn` definitions.  |
| `src/jobs/boss.ts`                  | pg-boss singleton (`getBoss()`, `work()`), queues stored in Postgres.                                                                                           |
| `src/jobs/queues.ts`                | **Empty** (`export {}`) — add a queue-name constant + payload type per job.                                                                                     |
| `src/jobs/worker.ts`                | `npm run worker`. Register handlers in `main()`. No handlers yet.                                                                                               |
| `src/ws/server.ts`                  | `npm run ws` on `WS_PORT` (3001). Presence tracking + `broadcast()`; `ServerEvent`/`ClientEvent` unions to extend. Clients always connect same-origin to `/ws`. |
| `src/scripts/seed.ts`               | `npm run db:seed`. Environment-aware entry point; creates `dev@example.com` / `password1234` outside production, then dispatches to the matching app-data hook. |
| `src/scripts/seed-app-data.ts`      | Empty-by-default `seedProductionData` and `seedNonProductionData` hooks for idempotent app records.                                                             |
| `src/server/load-env.ts`            | `.env` loader imported first by worker/ws/seed (the web process gets env from Vite).                                                                            |
| `src/router.tsx`                    | Router + QueryClient wiring. Rarely needs changes.                                                                                                              |
| `src/integrations/tanstack-query/*` | Query client provider + devtools panel.                                                                                                                         |
| `src/styles.css`                    | Tailwind v4 entry + all design tokens. §4.                                                                                                                      |

### `public/`

`manifest.json` (rename `short_name`/`name`, and `theme_color`/`background_color`
if you re-theme), `favicon.ico`, `logo192.png`, `logo512.png`, `robots.txt`,
`drizzle.svg`.

### `docs/recipes/` — complete, verified, copy-paste recipes

`crud.md` (a full user-owned collection, including `_authed.tsx`) ·
`forms.md` · `background-jobs.md` · `realtime.md` · `file-uploads.md` ·
`email.md` · `seo.md`

---

## 3. What does NOT exist yet

Knowing the absences saves a search:

- No `src/routes/_authed.tsx` — created by `docs/recipes/crud.md`.
- No app tables — `src/db/schema.ts` has only the four better-auth tables.
- No server functions — `src/functions/` holds only a README.
- No job queues and no registered handlers.
- No app-specific WebSocket events.
- No nav links — `links` in `Header.tsx` is an empty array.
- No `src/hooks/` directory (the shadcn alias points at one; create it if needed).
- No chart library, no date library, no state manager beyond TanStack Query.

---

## 4. Look and feel — one file

`src/styles.css` is the **only** place to change the app's visual identity.
Every component, including all of `ui/`, resolves its colors through these
tokens, so editing the values below re-themes the whole app in both light and
dark mode. Never hardcode hex colors in components; use the semantic classes
(`bg-background`, `text-muted-foreground`, `border`, `bg-accent`, …).

Structure of the file, top to bottom:

1. `@import 'tailwindcss'` · `@plugin '@tailwindcss/typography'` ·
   `@import 'tw-animate-css'` · `@import '@fontsource-variable/inter'`
   (self-hosted — no CDN, works offline).
2. `@custom-variant dark (&:is(.dark *))`
3. `:root { … }` — light-mode token values.
4. `.dark { … }` — dark-mode token values.
5. `@theme inline { … }` — maps each `--x` to `--color-x` so Tailwind emits
   `bg-x` / `text-x` utilities, plus `--font-sans` and the radius scale.
   **If you add a new token, add its `--color-*` mapping here too.**
6. `@layer base` — default border/outline, `min-height` on `html/body/#app`,
   `body { @apply bg-background text-foreground font-sans antialiased }`.

Tokens defined in both `:root` and `.dark` (current values are shadcn's zinc
defaults — swap them wholesale for a new palette):

`--background` `--foreground` · `--card` `--card-foreground` ·
`--popover` `--popover-foreground` · `--primary` `--primary-foreground` ·
`--secondary` `--secondary-foreground` · `--muted` `--muted-foreground` ·
`--accent` `--accent-foreground` · `--destructive` `--destructive-foreground` ·
`--border` `--input` `--ring` · `--chart-1`…`--chart-5` ·
`--sidebar` + 6 `--sidebar-*` variants

`--radius: 0.625rem` is declared in `:root` only and drives
`--radius-sm/md/lg/xl`. Lower it for a sharper look, raise it for a softer one.

Colors are written in `oklch(L C H)` — lightness 0–1, chroma, hue in degrees.
To warm a neutral palette, keep the lightness values and move hue toward
~40–70° with a small chroma bump. Change the font by editing `--font-sans` in
`@theme inline` and swapping the `@fontsource-variable/inter` import for
another `@fontsource-variable/*` package (add it to `package.json`).

Also update `theme_color` / `background_color` in `public/manifest.json` to
match a re-themed palette.

Both themes must look right — there is a visible toggle in the header, and the
default is `system`.

---

## 5. Kit API signatures

Verbatim, so you don't have to open these files.

**Auth** — `src/lib/auth-server.ts`

```ts
export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  return auth.api.getSession({ headers: getRequestHeaders() })
})

// Call FIRST in every server fn touching user-owned data. Redirects to
// /login when signed out. Wrapped in createServerOnlyFn so the pg import
// chain is stripped from the client bundle.
export const requireUser = createServerOnlyFn(async () => { … }) // → user
```

Client: `authClient.signIn.email({email, password})`,
`authClient.signUp.email({name, email, password})`, `authClient.signOut()` —
each returns `{ error }`; call `router.invalidate()` after success.

**Development test identities**

- `src/scripts/seed.ts` already creates `dev@example.com` / `password1234`
  outside production. When the app gains authenticated features, expand this
  into a small, deterministic set: a primary account with representative data,
  an alternate account for ownership/isolation checks, and one account per
  distinct permission role when applicable. Create them only on the
  non-production branch and keep the seed idempotent.
- Pass the seeded user IDs into `seedNonProductionData` and attach realistic
  records to the appropriate owners. Do not create disconnected users that
  all open onto the same empty state.
- Add a compact **Test accounts** panel to `/login`, visible only when
  `import.meta.env.DEV` is true. Each button names the account's role/scenario
  and signs in with `authClient.signIn.email`, followed by
  `router.invalidate()` and the normal redirect. This is a convenience UI over
  real authentication—not a special session endpoint, hard-coded cookie, or
  authorization bypass.
- Use this path during browser verification. Check the primary flow, switch to
  the alternate identity to prove user-owned data is isolated, and exercise
  each role-specific path the feature introduces.
- Production must run neither the test-user seed nor the test-account UI. Never
  put production secrets in source; fixed credentials are acceptable only for
  these disposable non-production identities.

Reading the session in a component: `const { session } = Route.useRouteContext()`
(or `useRouteContext({ from: '__root__' })`). `session?.user` has
`id`, `name`, `email`, `emailVerified`, `image`.

**Forms** — `src/components/form.tsx`

```tsx
const form = useAppForm({
  defaultValues: { title: '' },
  validators: { onSubmit: mySchema },   // the same Zod schema the server fn validates
  onSubmit: async ({ value }) => { … },
})

<form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
  <form.AppField name="title">
    {(field) => <field.TextField label="Title" />}
  </form.AppField>
  <form.AppForm>
    <form.SubmitButton>Save</form.SubmitButton>
  </form.AppForm>
</form>
```

Field components: `TextField` and `TextareaField` (both take `label` plus any
native input/textarea props) and `CheckboxField` (takes `label`).
`SubmitButton` subscribes to `isSubmitting` and renders `Working…` while
pending. Errors render under the field with `role="alert"` once touched.

**SEO** — `seo({ title?, description?, image? })` returns the meta array:

```ts
export const Route = createFileRoute('/pricing')({
  head: () => ({ meta: seo({ title: 'Pricing', description: '…' }) }),
})
```

**Server function shape** — one file per domain in `src/functions/`:

```ts
export const listPosts = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  return db.select().from(posts).where(eq(posts.userId, user.id))
})

export const createPost = createServerFn({ method: 'POST' })
  .validator(createPostSchema)          // pass the Zod schema directly
  .handler(async ({ data }) => { … })
```

**Toasts** — `import { toast } from 'sonner'`; `toast.success(…)` /
`toast.error(…)`. `<Toaster />` is already mounted in `__root.tsx`.

**Class merging** — `cn(...)` from `src/lib/utils.ts`.

---

## 6. Component inventory

Import kit components from `../components/…` and shadcn primitives from
`../components/ui/<name>` (the `#/` alias also resolves to `src/`). Icons come
from `lucide-react`, which is already a dependency.

| File in `ui/`   | Exports                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alert-dialog`  | `AlertDialog`, `Trigger`, `Portal`, `Overlay`, `Content`, `Header`, `Footer`, `Title`, `Description`, `Media`, `Action`, `Cancel` (all `AlertDialog*`-prefixed)                 |
| `alert`         | `Alert` (`variant`), `AlertTitle`, `AlertDescription`                                                                                                                           |
| `avatar`        | `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`                                                                                     |
| `badge`         | `Badge`, `badgeVariants` — variants `default` `secondary` `destructive` `outline` `ghost` `link`                                                                                |
| `breadcrumb`    | `Breadcrumb`, `List`, `Item`, `Link`, `Page`, `Separator`, `Ellipsis`                                                                                                           |
| `button`        | `Button`, `buttonVariants` — see below                                                                                                                                          |
| `card`          | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`                                                                                 |
| `checkbox`      | `Checkbox`                                                                                                                                                                      |
| `dialog`        | `Dialog`, `Trigger`, `Portal`, `Overlay`, `Content`, `Header`, `Footer`, `Title`, `Description`, `Close`                                                                        |
| `dropdown-menu` | `DropdownMenu`, `Trigger`, `Content`, `Group`, `Label`, `Item`, `CheckboxItem`, `RadioGroup`, `RadioItem`, `Separator`, `Shortcut`, `Sub`, `SubTrigger`, `SubContent`, `Portal` |
| `input`         | `Input`                                                                                                                                                                         |
| `label`         | `Label`                                                                                                                                                                         |
| `pagination`    | `Pagination`, `Content`, `Item`, `Link`, `Previous`, `Next`, `Ellipsis`                                                                                                         |
| `popover`       | `Popover`, `Trigger`, `Content`, `Anchor`, `Header`, `Title`, `Description`                                                                                                     |
| `radio-group`   | `RadioGroup`, `RadioGroupItem`                                                                                                                                                  |
| `scroll-area`   | `ScrollArea`, `ScrollBar`                                                                                                                                                       |
| `select`        | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`      |
| `separator`     | `Separator`                                                                                                                                                                     |
| `sheet`         | `Sheet`, `Trigger`, `Close`, `Content`, `Header`, `Footer`, `Title`, `Description`                                                                                              |
| `skeleton`      | `Skeleton` — use for every loading state                                                                                                                                        |
| `sonner`        | `Toaster` (already mounted)                                                                                                                                                     |
| `switch`        | `Switch`                                                                                                                                                                        |
| `table`         | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`                                                                        |
| `tabs`          | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants`                                                                                                            |
| `textarea`      | `Textarea`                                                                                                                                                                      |
| `tooltip`       | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`                                                                                                                |

`Button` props: `variant` = `default` `destructive` `outline` `secondary`
`ghost` `link`; `size` = `default` `xs` `sm` `lg` `icon` `icon-xs` `icon-sm`
`icon-lg`; `asChild` to wrap a router `<Link>`:

```tsx
<Button asChild>
  <Link to="/posts">Posts</Link>
</Button>
```

Anything not listed: `npx shadcn@latest add <component>` (config is already in
`components.json`).

---

## 7. Database

`src/db/schema.ts` currently defines exactly four better-auth tables. Extend
them if you like; never remove them.

| Table          | Key columns                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `user`         | `id` (text, pk), `name`, `email` (unique), `emailVerified` (bool), `image`, `createdAt`, `updatedAt`                          |
| `session`      | `id`, `expiresAt`, `token` (unique), `ipAddress`, `userAgent`, `userId` → `user.id` cascade, timestamps; index on `userId`    |
| `account`      | `id`, `accountId`, `providerId`, `userId` → `user.id` cascade, OAuth token columns, `password`, timestamps; index on `userId` |
| `verification` | `id`, `identifier`, `value`, `expiresAt`, timestamps; index on `identifier`                                                   |

Exported types: `User`, `Session` (`typeof user.$inferSelect` etc.). Export a
type per new table the same way and import it with `import type`.

App tables go below the `── App tables go below ──` marker. Every user-owned
table needs:

```ts
userId: text('user_id')
  .notNull()
  .references(() => user.id, { onDelete: 'cascade' })
```

Workflow: edit `schema.ts` → `npm run db:generate` → `npm run db:migrate` →
commit everything drizzle wrote under `drizzle/`. Never hand-write SQL
migrations, never `db:push`. Only migration so far: `0000_init`.

Lint gotcha: Drizzle rows aren't typed `| undefined`, so
`const [row] = await db.select()…; if (!row)` trips
`@typescript-eslint/no-unnecessary-condition`. Check `rows.length === 0` first
(see `src/scripts/seed.ts`).

---

## 8. Commands

```bash
npm run dev          # web app on :3000
npm run ws           # WebSocket server on :3001 (separate process)
npm run worker       # background job worker (separate process)
npm run db:generate  # SQL migration from schema.ts changes
npm run db:migrate   # apply pending migrations
npm run db:seed      # dev@example.com / password1234, idempotent
npm run db:studio    # Drizzle Studio
npm run generate-routes
npm run check        # prettier + typecheck + lint + test — run before done
npm run test         # vitest only
npm run build
npm start            # built production web server
npm run start:ws      # built production WebSocket server
npm run start:worker  # built production background worker
```

For production, see [DEPLOYMENT.md](./DEPLOYMENT.md) and the included Dockerfile.
The production smoke test uses a fresh database and never runs the dev seed.

In Gently development environments, the web process, ws server, worker, Postgres, env injection, and
the seed are all started for you by the template runtime config — you do not
need to run them by hand.

Until the app adds its role/scenario accounts, sign in as `dev@example.com` /
`password1234`. Once it does, use the development-only **Test accounts** panel
on `/login` rather than manually copying credentials.

---

## 9. Dependencies already installed

Don't add a package before checking here.

**Runtime** — `@tanstack/react-start`, `react-router`, `react-query`,
`react-form`, `router-plugin`, `react-devtools` · `react` 19 / `react-dom` ·
`better-auth` + `@better-auth/drizzle-adapter` · `drizzle-orm`, `drizzle-kit`,
`pg` · `pg-boss` · `ws` · `dotenv` · `zod` 4 · `tailwindcss` 4 + `@tailwindcss/vite` +
`@tailwindcss/typography` + `tw-animate-css` · `radix-ui`,
`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`,
`next-themes`, `sonner` · `@fontsource-variable/inter`

**Dev** — `vite` 8, `vitest` 4, `jsdom`, `@testing-library/react` + `/dom`,
`typescript` 6, `eslint` + `@tanstack/eslint-config`, `prettier`, `tsx`,
`nitro`, `esbuild`, `@types/*`

Notably absent: any charting, date, i18n, animation (beyond
`tw-animate-css`), rich-text, or file-storage library.

---

## 10. Environment

| Variable             | Notes                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Required. Injected on Gently by the postgres service.                           |
| `BETTER_AUTH_SECRET` | Required. Signs session tokens.                                                 |
| `BETTER_AUTH_URL`    | Optional; only for unusual proxy setups.                                        |
| `WS_PORT`            | Optional, defaults 3001. Keep in sync with the `/ws` proxy in `vite.config.ts`. |
| `VITE_ALLOWED_HOSTS` | Comma-separated; supplied by the runtime.                                       |

Secrets stay server-side. Only `VITE_`-prefixed variables reach the browser.
A new third-party key goes in three places: `.env.example` (documented),
`.env` (local value), and the Gently template runtime `env:` block.
