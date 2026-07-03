// Standalone worker process: `npm run worker`.
// Registers one handler per queue and waits for jobs. Runs separately from the
// web server so slow/retryable work never blocks a request.

import '../server/load-env'

import { work } from './boss'
import { processTask } from './handlers/process-task'
import { PROCESS_TASK } from './queues'
import type { ProcessTaskPayload } from './queues'

async function main() {
  await work<ProcessTaskPayload>(PROCESS_TASK, processTask)
  console.log('[worker] ready — waiting for jobs')
}

main().catch((error) => {
  console.error('[worker] failed to start', error)
  process.exit(1)
})
