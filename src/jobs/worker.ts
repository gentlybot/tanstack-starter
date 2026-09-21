// Standalone worker process: `npm run worker`.
// Registers one handler per queue and waits for jobs. Runs separately from the
// web server so slow/retryable work never blocks a request. Use a job whenever
// work is slow, retryable, or shouldn't block a request (emails, imports,
// calls to external APIs) — see docs/recipes/background-jobs.md.

import '../server/load-env'

import { getBoss } from './boss'

async function main() {
  // Connects to Postgres and keeps the process alive.
  const boss = await getBoss()

  let stopping = false
  const stop = () => {
    if (stopping) return
    stopping = true
    void boss.stop({ graceful: true, timeout: 10_000 }).catch((error) => {
      console.error('[worker] failed to stop', error)
      process.exitCode = 1
    })
  }
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)

  // Register handlers here, one line per queue:
  //
  // await work<SendWelcomeEmailPayload>(SEND_WELCOME_EMAIL, sendWelcomeEmail)

  console.log('[worker] ready — waiting for jobs')
}

main().catch((error) => {
  console.error('[worker] failed to start', error)
  process.exit(1)
})
