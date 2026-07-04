# Add a background job

Use this when work is slow, retryable, or shouldn't block a request: sending
emails, imports, calls to external APIs, report generation. The web process
enqueues; a separate worker process (`npm run worker`) executes. Queues live in
Postgres via pg-boss (a `pgboss` schema in the same database — no Redis, no
broker), and a handler that throws marks the job failed so pg-boss retries it
automatically. On gently the worker is already declared as the `worker` app in
`gently/apps.yml` — nothing to add there. Worked example below:
`send-welcome-email`, enqueued from a server function.

## 1. Declare the queue name and payload type

**`src/jobs/queues.ts`** (replace the whole file — this replaces the `export {}` placeholder)

```ts
// Queue names and payload types, shared between enqueuers (server functions)
// and the worker. Add a constant + payload type here for each new job, then
// register a handler in worker.ts — see docs/recipes/background-jobs.md.

export const SEND_WELCOME_EMAIL = 'send-welcome-email'
export type SendWelcomeEmailPayload = { userId: string }
```

## 2. Write the handler

**`src/jobs/handlers/send-welcome-email.ts`** (new file; the `handlers/` directory doesn't exist yet — create it)

```ts
import { eq } from 'drizzle-orm'

import { db } from '../../db/index'
import { user } from '../../db/schema'

import type { SendWelcomeEmailPayload } from '../queues'

// Runs in the worker process. Throwing marks the job failed and pg-boss
// retries it; returning normally completes it. Only throw for errors a retry
// could fix — a missing user won't reappear, so that case returns instead.
export async function sendWelcomeEmail({ userId }: SendWelcomeEmailPayload) {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1)

  if (rows.length === 0) {
    console.warn(`[worker] send-welcome-email: user ${userId} not found`)
    return
  }
  const [account] = rows

  // Replace this log with real sending — see docs/recipes/email.md.
  console.log(`[worker] welcome email → ${account.email} (${account.name})`)
}
```

## 3. Register the handler in the worker

**`src/jobs/worker.ts`** (replace the whole file)

```ts
// Standalone worker process: `npm run worker`.
// Registers one handler per queue and waits for jobs. Runs separately from the
// web server so slow/retryable work never blocks a request. Use a job whenever
// work is slow, retryable, or shouldn't block a request (emails, imports,
// calls to external APIs) — see docs/recipes/background-jobs.md.

import '../server/load-env'

import { work } from './boss'
import { sendWelcomeEmail } from './handlers/send-welcome-email'
import { SEND_WELCOME_EMAIL } from './queues'

import type { SendWelcomeEmailPayload } from './queues'

async function main() {
  // Register handlers here, one line per queue:
  await work<SendWelcomeEmailPayload>(SEND_WELCOME_EMAIL, sendWelcomeEmail)

  console.log('[worker] ready — waiting for jobs')
}

main().catch((error) => {
  console.error('[worker] failed to start', error)
  process.exit(1)
})
```

## 4. Enqueue from a server function

**`src/functions/onboarding.ts`** (new file)

```ts
import { createServerFn } from '@tanstack/react-start'

import { enqueue } from '../jobs/boss'
import { SEND_WELCOME_EMAIL } from '../jobs/queues'
import { requireUser } from '../lib/auth-server'

import type { SendWelcomeEmailPayload } from '../jobs/queues'

// `enqueue` returns as soon as the job row is written to Postgres — the
// request never waits for the email. The worker picks it up within seconds.
export const queueWelcomeEmail = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await requireUser()
    await enqueue<SendWelcomeEmailPayload>(SEND_WELCOME_EMAIL, {
      userId: user.id,
    })
    return { queued: true }
  },
)
```

Call `queueWelcomeEmail()` from any component (wrap it in a TanStack Query
`useMutation`) or from another server function — e.g. right after the step in
your signup/onboarding flow that should trigger the email.

## Verify

Terminal 1 — start the worker:

```bash
npm run worker
```

Expected output:

```
[worker] ready — waiting for jobs
```

Terminal 2 — enqueue a job for the seeded dev user with a throwaway script
(requires `npm run db:seed` to have run; on gently it runs on every setup):

**`src/scripts/enqueue-welcome-test.ts`** (temporary — delete after verifying)

```ts
import '../server/load-env'

import { eq } from 'drizzle-orm'

import { db } from '../db/index'
import { user } from '../db/schema'
import { enqueue } from '../jobs/boss'
import { SEND_WELCOME_EMAIL } from '../jobs/queues'

import type { SendWelcomeEmailPayload } from '../jobs/queues'

async function main() {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, 'dev@example.com'))
    .limit(1)

  if (rows.length === 0) {
    throw new Error('no dev user — run `npm run db:seed` first')
  }

  const jobId = await enqueue<SendWelcomeEmailPayload>(SEND_WELCOME_EMAIL, {
    userId: rows[0].id,
  })
  console.log(`[test] enqueued job ${jobId}`)
  process.exit(0) // pg-boss holds connections open; exit explicitly
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

```bash
npx tsx src/scripts/enqueue-welcome-test.ts
rm src/scripts/enqueue-welcome-test.ts
```

Expected: the script prints `[test] enqueued job <uuid>`, and within a few
seconds terminal 1 prints:

```
[worker] welcome email → dev@example.com (Dev User)
```

Then run `npm run typecheck` and `npm run lint` to confirm the new files are
clean.
