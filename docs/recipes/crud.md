# CRUD: a user-owned collection (posts)

Use this when the app needs a collection users can create, view, edit, and delete — the most common feature shape. It builds a `posts` collection end-to-end: a Drizzle table scoped to the signed-in user, five server functions, a shared auth guard layout, and three pages (list, create, edit/delete). Every query filters by `user.id`, so one user can never see another user's rows. When adapting, rename consistently: `posts` → `invoices`, `Post` → `Invoice`, `postInputSchema` → `invoiceInputSchema`, `/posts` → `/invoices`, `_authed.posts.*` → `_authed.invoices.*`, and swap the `title`/`content` columns for your fields. Everything below was verified end-to-end (typecheck, lint, SSR, sign-in, create/edit/delete in a real browser, and cross-user scoping).

## 1. Make `requireUser` server-only (one-time fix in `src/lib/auth-server.ts`)

`requireUser` is a plain function, so unlike server functions its body is NOT stripped from the client bundle. If it is left unwrapped, any client-reachable import of `src/lib/auth-server.ts` (the root route imports `getSession` from it) drags `auth` → `db` → the `pg` driver into the browser, which crashes at module init with `ReferenceError: Buffer is not defined` — and that kills hydration for the whole app, silently breaking every form (they fall back to native GET submits). Wrapping it in `createServerOnlyFn` makes the compiler strip the body and the import chain from client modules; on the client it becomes a stub that throws if called.

**`src/lib/auth-server.ts`**

```tsx
import { redirect } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from './auth'

// Server-side session access. Two entry points:
//
// - `getSession` (server function): called from route `beforeLoad` /
//   loaders. The root route puts its result into router context, so any
//   route can read `context.session` — see src/routes/__root.tsx.
//
// - `requireUser` (server-only helper): call it FIRST in every server
//   function handler that reads or writes user-owned data, then filter every
//   query by `user.id`. It redirects to /login when there is no session.
//   This is the data-scoping rule — see AGENTS.md.
//
// requireUser is wrapped in createServerOnlyFn so the compiler strips its
// body (and the `auth` → db → pg import chain) from the client bundle.
// Without it, importing this file from client-reachable code pulls the
// Postgres driver into the browser and crashes hydration.

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    return auth.api.getSession({ headers: getRequestHeaders() })
  },
)

export const requireUser = createServerOnlyFn(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) {
    throw redirect({ to: '/login' })
  }
  return session.user
})
```

If your `auth-server.ts` already has `createServerOnlyFn`, skip this step.

## 2. Add the table to `src/db/schema.ts` and migrate

Append under the `── App tables go below ──` marker (keep the auth tables above untouched). Add `serial` to the existing `drizzle-orm/pg-core` import.

**`src/db/schema.ts`** (the app-tables section; the import line at the top of the file becomes `import { boolean, index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'`)

```tsx
// ── App tables go below ─────────────────────────────────────────────────────

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('posts_user_id_idx').on(table.userId)],
)

export type Post = typeof posts.$inferSelect
```

Then generate and apply the migration:

```sh
npm run db:generate   # writes drizzle/000N_*.sql
npm run db:migrate    # applies it to DATABASE_URL
```

Every user-owned table follows this shape: `userId` referencing `user.id` with `onDelete: 'cascade'` plus an index on it, and `createdAt`/`updatedAt` timestamptz columns.

## 3. Server functions: `src/functions/posts.ts`

One file per domain area. One Zod schema shared by the forms and the server functions. Every handler calls `requireUser()` first; every query filters by `user.id` (get/update/delete use `and(eq(id), eq(userId))`); update/delete throw `Error('Not found')` when no row matched — which is also what a signed-in user hitting someone else's row sees.

**`src/functions/posts.ts`**

```tsx
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index'
import { posts } from '../db/schema'
import { requireUser } from '../lib/auth-server'

// One Zod schema shared by the create/edit forms (validators.onSubmit) and
// the server functions (.validator()) so client and server always agree.
//
// Note: content is a plain z.string(), NOT .optional().default('') — a
// defaulted field makes the schema's input type `string | undefined`, which
// TanStack Form rejects when defaultValues provide a plain string. The
// empty-string default comes from the form's defaultValues (and the DB
// column default for non-form callers).
export const postInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Enter a title')
    .max(200, 'Keep it under 200 characters'),
  content: z.string(),
})

export type PostInput = z.infer<typeof postInputSchema>

// Every handler calls requireUser() first and scopes every query by
// user.id — this is what keeps one user's rows invisible to another.

export const listPosts = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  return db
    .select()
    .from(posts)
    .where(eq(posts.userId, user.id))
    .orderBy(desc(posts.createdAt))
})

export const getPost = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, data.id), eq(posts.userId, user.id)))
    const post = rows.at(0)
    if (!post) {
      throw new Error('Not found')
    }
    return post
  })

export const createPost = createServerFn({ method: 'POST' })
  .validator(postInputSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const [post] = await db
      .insert(posts)
      .values({ userId: user.id, title: data.title, content: data.content })
      .returning()
    return post
  })

export const updatePost = createServerFn({ method: 'POST' })
  .validator(postInputSchema.extend({ id: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const rows = await db
      .update(posts)
      .set({ title: data.title, content: data.content })
      .where(and(eq(posts.id, data.id), eq(posts.userId, user.id)))
      .returning()
    const post = rows.at(0)
    if (!post) {
      throw new Error('Not found')
    }
    return post
  })

export const deletePost = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const deleted = await db
      .delete(posts)
      .where(and(eq(posts.id, data.id), eq(posts.userId, user.id)))
      .returning({ id: posts.id })
    if (deleted.length === 0) {
      throw new Error('Not found')
    }
    return { ok: true }
  })
```

Two details that matter:

- Use `rows.at(0)` (not `const [post] = rows`) before a `!post` check — array destructuring types the element as non-undefined here, so eslint rejects the check as an unnecessary condition.
- Zod v4 is in use: `z.email()` is top-level, and schemas are passed directly to `.validator()` — no wrapper.

## 4. The auth guard layout: `src/routes/_authed.tsx`

Created ONCE, then shared by every protected page — all route files named `_authed.*` render inside it and inherit the redirect. It is not pre-shipped with the kit because a pathless layout route with no children breaks `tsr generate` (path conflict with `/`), so it must land together with its first child routes (this recipe's). The session it checks comes from the root route's `beforeLoad` (see `src/routes/__root.tsx`), which puts `session` into router context.

**`src/routes/_authed.tsx`**

```tsx
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

// Pathless layout that guards every child route (any file named
// `_authed.*`). The session comes from the root route's beforeLoad — see
// src/routes/__root.tsx. Signed-out visitors are redirected to /login and
// bounced back to where they were after signing in.
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
```

## 5. The list page: `src/routes/_authed.posts.index.tsx` → `/posts`

Data pattern used throughout: route `loader` + `Route.useLoaderData()`, and after any mutation call `router.invalidate()` to re-run loaders. Keep this one pattern consistent — don't mix in useQuery for the same data.

**`src/routes/_authed.posts.index.tsx`**

```tsx
import { Link, createFileRoute } from '@tanstack/react-router'
import { FileText, Plus } from 'lucide-react'

import { EmptyState } from '../components/empty-state'
import { PageHeader } from '../components/page-header'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { listPosts } from '../functions/posts'
import { seo } from '../lib/seo'

// List page: the loader fetches once per navigation; mutations elsewhere call
// router.invalidate() so this reloads with fresh data.
export const Route = createFileRoute('/_authed/posts/')({
  loader: () => listPosts(),
  head: () => ({ meta: seo({ title: 'Posts' }) }),
  component: PostsPage,
})

function PostsPage() {
  const posts = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <PageHeader title="Posts" description="Everything you've written.">
        <Button asChild>
          <Link to="/posts/new">
            <Plus /> New post
          </Link>
        </Button>
      </PageHeader>

      {posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description="Write your first post to see it show up here."
        >
          <Button asChild>
            <Link to="/posts/new">
              <Plus /> New post
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              to="/posts/$postId"
              params={{ postId: String(post.id) }}
              className="group"
            >
              <Card className="transition-colors group-hover:border-primary/40">
                <CardContent className="space-y-1">
                  <p className="font-medium">{post.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 6. The create page: `src/routes/_authed.posts.new.tsx` → `/posts/new`

The form shares `postInputSchema` with `createPost`'s `.validator()`. See `docs/recipes/forms.md` for the full form pattern.

**`src/routes/_authed.posts.new.tsx`**

```tsx
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { useAppForm } from '../components/form'
import { PageHeader } from '../components/page-header'
import { Card, CardContent } from '../components/ui/card'
import { createPost, postInputSchema } from '../functions/posts'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/_authed/posts/new')({
  head: () => ({ meta: seo({ title: 'New post' }) }),
  component: NewPostPage,
})

function NewPostPage() {
  const router = useRouter()

  const form = useAppForm({
    defaultValues: { title: '', content: '' },
    validators: { onSubmit: postInputSchema },
    onSubmit: async ({ value }) => {
      try {
        const post = await createPost({ data: value })
        toast.success('Post created')
        await router.invalidate()
        await router.navigate({
          to: '/posts/$postId',
          params: { postId: String(post.id) },
        })
      } catch {
        toast.error('Could not create the post')
      }
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="New post" />
      <Card>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              form.handleSubmit()
            }}
          >
            <form.AppField name="title">
              {(field) => <field.TextField label="Title" />}
            </form.AppField>
            <form.AppField name="content">
              {(field) => <field.TextareaField label="Content" rows={8} />}
            </form.AppField>
            <div>
              <form.AppForm>
                <form.SubmitButton>Create post</form.SubmitButton>
              </form.AppForm>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 7. The detail/edit page: `src/routes/_authed.posts.$postId.tsx` → `/posts/$postId`

Loader fetches the post (params are strings — convert with `Number()`), the form is prefilled from loader data, Save calls `updatePost`, and Delete opens an AlertDialog before calling `deletePost`.

**`src/routes/_authed.posts.$postId.tsx`**

```tsx
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAppForm } from '../components/form'
import { PageHeader } from '../components/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import {
  deletePost,
  getPost,
  postInputSchema,
  updatePost,
} from '../functions/posts'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/_authed/posts/$postId')({
  loader: ({ params }) => getPost({ data: { id: Number(params.postId) } }),
  head: ({ loaderData }) => ({
    meta: seo({ title: loaderData?.title ?? 'Post' }),
  }),
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()
  const router = useRouter()

  const form = useAppForm({
    defaultValues: { title: post.title, content: post.content },
    validators: { onSubmit: postInputSchema },
    onSubmit: async ({ value }) => {
      try {
        await updatePost({ data: { id: post.id, ...value } })
        toast.success('Post saved')
        await router.invalidate()
      } catch {
        toast.error('Could not save the post')
      }
    },
  })

  async function handleDelete() {
    try {
      await deletePost({ data: { id: post.id } })
      toast.success('Post deleted')
      await router.invalidate()
      await router.navigate({ to: '/posts' })
    } catch {
      toast.error('Could not delete the post')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={post.title}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes "{post.title}". This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <Card>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              form.handleSubmit()
            }}
          >
            <form.AppField name="title">
              {(field) => <field.TextField label="Title" />}
            </form.AppField>
            <form.AppField name="content">
              {(field) => <field.TextareaField label="Content" rows={8} />}
            </form.AppField>
            <div>
              <form.AppForm>
                <form.SubmitButton>Save</form.SubmitButton>
              </form.AppForm>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 8. Add the nav link in `src/components/Header.tsx`

Change the `links` array (only this — leave the rest of the file alone):

```tsx
const links: Array<{ to: string; label: string }> = [
  { to: '/posts', label: 'Posts' },
]
```

## 9. Regenerate the route tree

```sh
npm run generate-routes
```

NEVER edit `src/routeTree.gen.ts` by hand. If `tsr generate` reports a path conflict, check that `_authed.tsx` has at least one `_authed.*` child route file.

## Verify

All of these were run against a fresh database and must pass:

```sh
npm run generate-routes        # exits clean
npx tsc --noEmit               # no errors
npm run lint                   # no errors
```

Boot the dev server (`npx vite dev --port 3021`), then:

1. **Sign in via the API and capture the session cookie:**

   ```sh
   curl -s -D- -c /tmp/c.txt -X POST http://localhost:3021/api/auth/sign-in/email \
     -H 'content-type: application/json' \
     -d '{"email":"dev@example.com","password":"password1234"}'
   ```

   Expect `HTTP/1.1 200` and a `set-cookie: better-auth.session_token=…` header. (`dev@example.com` comes from `npm run db:seed`.)

2. **Signed-in list page renders:** `curl -s -b /tmp/c.txt http://localhost:3021/posts | grep -a 'No posts yet'` matches (the SSR HTML can register as binary — always `grep -a`). With rows present, the titles appear in the HTML.

3. **Signed-out users are redirected (server-side):**

   ```sh
   curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3021/posts
   ```

   Expect `307 http://localhost:3021/login?redirect=%2Fposts` — the guard runs during SSR, so signed-out visitors never receive page content, and after signing in they bounce back to `/posts`.

4. **Per-user scoping:** create a second user (`curl -X POST …/api/auth/sign-up/email -d '{"name":"B","email":"b@example.com","password":"password5678"}'`), insert a post owned by them directly in SQL with a distinctive title, then confirm the first user's `/posts` HTML does NOT contain that title (and their own posts still appear). Fetching the other user's detail URL as the first user renders the error page ("Not found"), not the post.

5. **Browser flow:** sign in through `/login`, create a post at `/posts/new` (expect "Post created" toast + navigation to the detail page), edit and Save (expect "Post saved" toast and the heading to refresh via `router.invalidate()`), Delete via the confirmation dialog (expect "Post deleted" toast, navigation to `/posts`, row gone). If forms do a full-page GET navigation with the fields in the URL instead, hydration is broken — check the browser console for `Buffer is not defined` and re-read step 1.
