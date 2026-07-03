import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

// The database schema is the single source of truth. Change it here, then run
// `npm run db:generate` to produce a SQL migration in drizzle/ and
// `npm run db:migrate` to apply it. Export inferred types for the app.

export const taskStatuses = ['pending', 'processing', 'done'] as const
export type TaskStatus = (typeof taskStatuses)[number]

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status', { enum: taskStatuses }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Added after the initial release — see drizzle/0001_*.sql for the generated
  // migration. This is the schema-change workflow in action: edit here, then
  // `npm run db:generate` + `npm run db:migrate`.
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export type Task = typeof tasks.$inferSelect

// Chat messages for the realtime WebSocket demo. Each message is both
// broadcast over the socket and persisted here, so history survives reloads.
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  author: text('author').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Message = typeof messages.$inferSelect
