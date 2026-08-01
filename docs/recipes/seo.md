# Page titles, descriptions, and social cards

Use this when a page needs its own `<title>`, meta description, or social
(Open Graph) card. There is exactly one pattern: every route that deserves
its own metadata exports a `head()` that returns `meta: seo(…)` from
`src/lib/seo.ts`. Titles render as `<title> · <APP_NAME>`, and the root route
already provides the app-wide default — so most pages need one line.

## 1. Static pages: `head()` + `seo()`

`src/routes/login.tsx` in the kit already does this
(`head: () => ({ meta: seo({ title: 'Sign in' }) })`). A new static page
looks like:

**`src/routes/about.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { seo } from '../lib/seo'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: seo({
      title: 'About',
      description: 'What this app does and who built it.',
    }),
  }),
  component: AboutPage,
})

function AboutPage() {
  return <h1 className="text-2xl font-bold tracking-tight">About</h1>
}
```

## 2. Detail pages: `head()` from loader data

`head` receives the route's loader result as `loaderData` (typed, possibly
`undefined` — always use `loaderData?.`). This demo inlines its data; in a
real detail page the loader calls your server function instead and the
`head` line stays identical.

**`src/routes/posts.$postId.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { seo } from '../lib/seo'

// Demo data — in a real app the loader calls a server function
// (src/functions/) that fetches the record by params.postId.
const posts: Record<string, { title: string; summary: string }> = {
  'hello-world': {
    title: 'Hello World',
    summary: 'The first post.',
  },
}

export const Route = createFileRoute('/posts/$postId')({
  loader: ({ params }) => posts[params.postId],
  head: ({ loaderData }) => ({
    meta: seo({
      title: loaderData?.title,
      description: loaderData?.summary,
    }),
  }),
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()
  if (!post) return <p className="text-muted-foreground">Post not found.</p>
  return (
    <article className="grid gap-2">
      <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
      <p className="text-muted-foreground">{post.summary}</p>
    </article>
  )
}
```

## 3. The app-wide default (already wired)

`src/routes/__root.tsx` calls `seo({ description: APP_DESCRIPTION })` in its
`head()`, so every page without its own `head` gets the app name as title
plus the default description. Child `head()`s merge over it — a page title
replaces the root title, everything else is inherited. Don't repeat the
defaults in page routes.

To rename the app, edit `APP_NAME` and `APP_DESCRIPTION` in
`src/lib/app.ts` — titles, the header brand, and auth pages all follow. Also
update `name`/`short_name` in `public/manifest.json` to match (it's a static
file, it doesn't read `APP_NAME`).

## 4. Social card images

`seo({ image })` emits `og:image` plus `twitter:card: summary_large_image`.
Expectations: a 1200×630 image, and an **absolute URL** — social crawlers
don't reliably resolve relative paths. Put a static card in `public/`
(e.g. `public/og.png`) and pass the full URL for your deployed origin, e.g.
`seo({ title: 'Pricing', image: 'https://yourdomain.com/og.png' })`.

## 5. robots.txt and manifest.json

Both are static files served from `public/`:

- `public/robots.txt` currently allows all crawlers everywhere. Add
  `Disallow:` lines for paths that shouldn't be indexed.
- `public/manifest.json` is the PWA manifest (name, icons, theme color) —
  keep its names in sync with `APP_NAME` and replace `logo192.png` /
  `logo512.png` when you brand the app.

## Verify

```sh
npm run dev
```

```sh
curl -s http://localhost:3000/login | grep -o '<title>[^<]*</title>'
# <title>Sign in · Work In Progress</title>

curl -s http://localhost:3000/posts/hello-world | grep -o '<title>[^<]*</title>'
# <title>Hello World · Work In Progress</title>

curl -s http://localhost:3000/ | grep -o 'property="og:[a-z:]*"' | sort -u
# property="og:description"
# property="og:title"
```
