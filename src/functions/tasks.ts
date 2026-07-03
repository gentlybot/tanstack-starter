import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'

import { db } from '../db/index'
import { tasks } from '../db/schema'
import { enqueue } from '../jobs/boss'
import { PROCESS_TASK } from '../jobs/queues'

import type { ProcessTaskPayload } from '../jobs/queues'

// Server functions: type-safe RPC between the client and the server. The
// build strips these implementations from the client bundle, so importing
// this file from components is safe — the db/pg-boss code never ships to the
// browser.

/** List the most recent tasks. */
export const listTasks = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(tasks).orderBy(desc(tasks.id)).limit(50)
})

/**
 * Create a task, then enqueue a background job to process it. This is the
 * full loop: request → row → queued job → worker → status update.
 */
export const createTask = createServerFn({ method: 'POST' })
  .validator((data: { title: string }) => {
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    if (!title) throw new Error('title is required')
    return { title }
  })
  .handler(async ({ data }) => {
    const [task] = await db
      .insert(tasks)
      .values({ title: data.title })
      .returning()
    await enqueue<ProcessTaskPayload>(PROCESS_TASK, { taskId: task.id })
    return task
  })
