# Accept file uploads

Use this when users need to attach images to anything — avatars, post covers,
gallery items. Uploads are raw HTTP (multipart request in, binary response
out), so this is one of the few cases that calls for server routes instead of
server functions. Files land on local disk in `./uploads/`, which works in
local dev and in gently sandboxes (the directory lives in the workspace); see
the last step for the production swap.

## 1. Create the upload endpoint

Requires a session via `requireUser()` — it works in server routes too, since
it reads the request headers from async context. A request with no session
gets a 307 redirect to `/login`. Validates size and an image content-type
allowlist, then writes the file under a random name so client-supplied
filenames never touch the filesystem.

**`src/routes/api/uploads.ts`**

```ts
import { createFileRoute } from '@tanstack/react-router'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { requireUser } from '../../lib/auth-server'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

// Allowed content types → the extension we store. The extension comes from
// the validated content type, never from the client's filename. Keep in sync
// with the MIME map in uploads.$file.ts.
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

export const Route = createFileRoute('/api/uploads')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await requireUser()

        const formData = await request.formData()
        const file = formData.get('file')
        if (!(file instanceof File)) {
          return Response.json(
            { error: 'missing "file" field' },
            { status: 400 },
          )
        }
        const extension = EXTENSION_BY_TYPE[file.type]
        if (!extension) {
          return Response.json(
            { error: `unsupported content type ${file.type || '(none)'}` },
            { status: 415 },
          )
        }
        if (file.size > MAX_BYTES) {
          return Response.json(
            { error: 'file too large (max 10MB)' },
            { status: 413 },
          )
        }

        const name = `${randomUUID()}${extension}`
        await mkdir(UPLOADS_DIR, { recursive: true })
        await writeFile(
          path.join(UPLOADS_DIR, name),
          Buffer.from(await file.arrayBuffer()),
        )

        return Response.json({ url: `/api/uploads/${name}` })
      },
    },
  },
})
```

## 2. Create the serving endpoint

Serves a stored file back by name. The path-traversal guard is load-bearing:
the `$file` param is only accepted when it is a plain filename
(`path.basename(name) === name` rejects `../package.json` and friends), and
only extensions in the MIME map are served.

**`src/routes/api/uploads.$file.ts`**

```ts
import { createFileRoute } from '@tanstack/react-router'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export const Route = createFileRoute('/api/uploads/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Path-traversal guard: only plain filenames, nothing with a
        // separator ('../secret', '/etc/passwd') gets near the filesystem.
        const name = params.file
        if (path.basename(name) !== name) {
          return new Response('Not found', { status: 404 })
        }
        const mime = MIME_BY_EXTENSION[path.extname(name).toLowerCase()]
        if (!mime) {
          return new Response('Not found', { status: 404 })
        }
        try {
          const data = await readFile(path.join(UPLOADS_DIR, name))
          return new Response(new Uint8Array(data), {
            headers: {
              'Content-Type': mime,
              // Names are random UUIDs, so a URL's content never changes.
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ) {
            return new Response('Not found', { status: 404 })
          }
          throw error
        }
      },
    },
  },
})
```

## 3. Upload from the client

Plain `fetch` with `FormData` — do not set a `Content-Type` header, the
browser adds the multipart boundary itself. This demo page is signed-in only
(the endpoint requires a session anyway); in a real app the same
`fetch('/api/uploads', …)` call goes wherever your form lives, and the
returned `url` is what you save on your own records.

**`src/routes/upload-demo.tsx`**

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/upload-demo')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/login', search: { redirect: '/upload-demo' } })
    }
  },
  component: UploadDemoPage,
})

function UploadDemoPage() {
  const [url, setUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        toast.error(body?.error ?? `Upload failed (${response.status})`)
        return
      }
      const result = (await response.json()) as { url: string }
      setUrl(result.url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Upload an image</h1>
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        disabled={uploading}
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      {url && (
        <img src={url} alt="Uploaded" className="max-w-sm rounded-md border" />
      )}
    </div>
  )
}
```

## 4. Keep uploads out of git

Add `uploads` to the ignore list.

**`.gitignore`**

```
node_modules
.DS_Store
dist
dist-ssr
*.local
.env
.nitro
.tanstack
.wrangler
.output
.vinxi
__unconfig*
todos.json
uploads
```

## 5. Production durability

Local disk is fine for dev and sandboxes but disappears with the machine. For
production, swap the `writeFile` in the POST handler for an S3 `PutObject`
and the `readFile` in the GET handler for a `GetObject` (or return a redirect
to a presigned/CDN URL). The route shapes, validation, and the
`{ url }` contract stay identical — nothing else in the app changes.

## Verify

```sh
npm run dev
```

The dev server picks up the new route files automatically (run
`npm run generate-routes` if you only want to regenerate the route tree).

In the browser: open `http://localhost:3000/upload-demo`, sign in as the seed
user (`dev@example.com` / `password1234`), choose an image — it renders from
its new `/api/uploads/<uuid>.<ext>` URL.

From a terminal:

```sh
# No session → redirected to the login page
curl -si -X POST http://localhost:3000/api/uploads | head -2
# HTTP/1.1 307 Temporary Redirect
# location: /login

# Path traversal → 404, file never read
curl -si 'http://localhost:3000/api/uploads/%2e%2e%2fpackage.json' | head -1
# HTTP/1.1 404 Not Found

# The stored file exists on disk under a random name
ls uploads
# 6f1f0c8e-6a3f-4d5e-9d0a-1b2c3d4e5f6a.png
```
