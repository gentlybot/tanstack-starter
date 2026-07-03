import { eq } from 'drizzle-orm'

import { db } from '../../db/index'
import { tasks } from '../../db/schema'

import type { ProcessTaskPayload } from '../queues'

export async function processTask({ taskId }: ProcessTaskPayload) {
  await db
    .update(tasks)
    .set({ status: 'processing' })
    .where(eq(tasks.id, taskId))

  // Simulated slow work — replace with the real thing (emails, imports,
  // third-party API calls, report generation, ...).
  await new Promise((resolve) => setTimeout(resolve, 3000))

  await db
    .update(tasks)
    .set({ status: 'done', completedAt: new Date() })
    .where(eq(tasks.id, taskId))

  console.log(`[worker] processed task ${taskId}`)
}
