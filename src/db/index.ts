import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

// A single shared Drizzle client, used by TanStack Start server functions AND
// by the standalone worker + WebSocket processes. The connection string is
// read from the environment (DATABASE_URL) so all three runtimes behave the
// same.
//
// The client is created lazily on first use: reading DATABASE_URL at import
// time would crash the whole server module graph if the env var were missing
// (and breaks on runtimes that inject env per-request). Deferring it means a
// misconfigured env surfaces as a normal request error.
type Db = ReturnType<typeof drizzle<typeof schema>>

let instance: Db | null = null

function getDb(): Db {
  if (!instance) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set — see .env.example')
    }
    instance = drizzle(databaseUrl, { schema })
  }
  return instance
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const value = getDb()[prop as keyof Db]
    return typeof value === 'function' ? value.bind(getDb()) : value
  },
})
