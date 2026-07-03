import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'

import { db } from '../../db/index'

// A server route: a raw HTTP endpoint served by TanStack Start, for callers
// OUTSIDE the app (curl, uptime checks, webhooks). For app-internal
// client↔server calls, prefer server functions (src/functions/).
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`select 1`)
          return Response.json({ ok: true })
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : 'db unreachable',
            },
            { status: 503 },
          )
        }
      },
    },
  },
})
