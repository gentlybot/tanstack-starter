import { PgBoss } from 'pg-boss'

// pg-boss stores its queues inside Postgres (in a `pgboss` schema), so
// background jobs need no extra infrastructure beyond the database the app
// already has — no Redis, no broker. The same helpers are used by the web
// process (to enqueue) and the worker process (to consume).

let bossPromise: Promise<PgBoss> | null = null
const ensuredQueues = new Set<string>()

export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not set — see .env.example')
      }
      const boss = new PgBoss(databaseUrl)
      boss.on('error', (error) => console.error('[pg-boss]', error))
      await boss.start()
      return boss
    })()
  }
  return bossPromise
}

async function ensureQueue(boss: PgBoss, queue: string) {
  if (ensuredQueues.has(queue)) return
  await boss.createQueue(queue)
  ensuredQueues.add(queue)
}

/** Enqueue a job from anywhere on the server (server functions, routes). */
export async function enqueue<TData extends object>(
  queue: string,
  data: TData,
): Promise<string | null> {
  const boss = await getBoss()
  await ensureQueue(boss, queue)
  return boss.send(queue, data)
}

/** Register a handler for a queue. Called by the worker process. */
export async function work<TData extends object>(
  queue: string,
  handler: (data: TData) => Promise<void>,
): Promise<void> {
  const boss = await getBoss()
  await ensureQueue(boss, queue)
  await boss.work<TData>(queue, async (jobs) => {
    for (const job of jobs) {
      await handler(job.data)
    }
  })
}
