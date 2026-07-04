# Send email

Use this when the app needs to send transactional email — welcome messages,
password resets, notifications. Email always goes through a background job
(never inline in a request): sending is slow, the provider can flake, and a
failed job retries automatically. This recipe builds on
[docs/recipes/background-jobs.md](./background-jobs.md) — follow it first; it
sets up the `send-welcome-email` queue, handler, worker registration, and
enqueue-from-a-server-function wiring that this recipe plugs real sending
into. The provider is [Resend](https://resend.com) via its plain HTTP API —
no SDK dependency.

## 1. Create the email helper

When `RESEND_API_KEY` is unset (local dev, gently sandboxes) it logs the
email to the console and returns — dev environments never fail on email. With
a key set, it POSTs to Resend and throws on non-2xx so pg-boss retries the
job.

**`src/lib/email.ts`**

```ts
// Transactional email via Resend's HTTP API — plain fetch, no SDK. Always
// call this from a background job, never inline in a request, so failures
// retry automatically — see docs/recipes/background-jobs.md.

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'My App <onboarding@resend.dev>'

  // Dev mode: no key (local dev, sandboxes) → log instead of send.
  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not set — logging instead of sending\n` +
        `  from: ${from}\n  to: ${to}\n  subject: ${subject}\n  html: ${html}`,
    )
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!response.ok) {
    // Throw so the job fails and pg-boss retries it.
    throw new Error(
      `[email] Resend ${response.status}: ${await response.text()}`,
    )
  }
}
```

## 2. Add the env variables

Secrets stay server-side: `.env` locally, the `env:` block in
`gently/apps.yml` on gently. Leave both unset until you actually want mail
delivered.

Add to the end of **`.env.example`**:

```
# Resend API key for transactional email (docs/recipes/email.md). Leave unset
# in dev — emails are logged to the worker console instead of sent.
# RESEND_API_KEY=re_...

# From address for outgoing email. Must be on a domain verified in Resend;
# the default 'My App <onboarding@resend.dev>' only delivers to your own
# Resend account's address.
# EMAIL_FROM=My App <hello@yourdomain.com>
```

And the shared `env:` block in **`gently/apps.yml`** becomes:

```yaml
# Shared env for setup + every app process.
env:
  # Signs better-auth session tokens. Sandbox-internal value; use a real
  # secret (openssl rand -base64 32) for anything public-facing.
  BETTER_AUTH_SECRET: gently-sandbox-dev-secret-0123456789abcdef
  # Email (docs/recipes/email.md). Leave RESEND_API_KEY unset in sandboxes —
  # sendEmail logs to the worker console instead of sending.
  # RESEND_API_KEY: re_...
  # EMAIL_FROM: 'My App <hello@yourdomain.com>'
```

## 3. Send from the job handler

Replace the placeholder `console.log` in the handler from
[background-jobs.md](./background-jobs.md) with a real `sendEmail` call. The
queue, worker registration, and enqueue site are already done — this is the
only job file that changes.

**`src/jobs/handlers/send-welcome-email.ts`**

```ts
import { eq } from 'drizzle-orm'

import { db } from '../../db/index'
import { user } from '../../db/schema'
import { sendEmail } from '../../lib/email'

import type { SendWelcomeEmailPayload } from '../queues'

// Runs in the worker process. sendEmail throws on provider errors, which
// marks the job failed so pg-boss retries it. Only throw for errors a retry
// could fix — a missing user won't reappear, so that case returns instead.
export async function sendWelcomeEmail({ userId }: SendWelcomeEmailPayload) {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1)

  if (rows.length === 0) {
    console.warn(`[worker] send-welcome-email: user ${userId} not found`)
    return
  }
  const [account] = rows

  await sendEmail({
    to: account.email,
    subject: 'Welcome!',
    html: `<p>Hi ${account.name}, thanks for signing up.</p>`,
  })
}
```

Any other email (password reset, notification) is the same shape: a new
queue + handler per [background-jobs.md](./background-jobs.md), with the
handler ending in a `sendEmail` call.

## Verify

With `RESEND_API_KEY` unset (the default), the email is logged, not sent.

Terminal 1 — start the worker:

```sh
npm run worker
# [worker] ready — waiting for jobs
```

Terminal 2 — trigger the job with the throwaway enqueue script from the
[Verify section of background-jobs.md](./background-jobs.md#verify):

```sh
npx tsx src/scripts/enqueue-welcome-test.ts
# [test] enqueued job <uuid>
```

Within a few seconds, terminal 1 shows the dev-mode log instead of a send:

```
[email] RESEND_API_KEY not set — logging instead of sending
  from: My App <onboarding@resend.dev>
  to: dev@example.com
  subject: Welcome!
  html: <p>Hi Dev User, thanks for signing up.</p>
```

To send for real, set `RESEND_API_KEY` (and `EMAIL_FROM` on a verified
domain) in `.env`, restart the worker, and enqueue again — the same job now
POSTs to Resend.
