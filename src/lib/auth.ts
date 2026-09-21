import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '../db/index'
import * as schema from '../db/schema'
import { resolveAuthBaseURL } from './auth-base-url'

// Server-side auth instance (better-auth). HTTP endpoints are mounted at
// /api/auth/* by src/routes/api/auth/$.ts; the browser talks to them through
// src/lib/auth-client.ts. Server code checks sessions via src/lib/auth-server.ts.
//
// Email + password is enabled out of the box. To add social providers, add a
// `socialProviders` block here (keys via env) — see the better-auth docs.

export const auth = betterAuth({
  // BETTER_AUTH_SECRET signs session tokens — required in production, and a
  // dev fallback keeps local/sandbox boots working without one.
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-insecure-secret',
  // Set BETTER_AUTH_URL for one canonical origin. Add a comma-separated
  // BETTER_AUTH_ALLOWED_HOSTS list when the same app is served from multiple
  // approved domains; unknown hosts are rejected.
  baseURL: resolveAuthBaseURL(process.env),
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
  },
  // Must stay LAST in the plugins array — lets better-auth set cookies from
  // TanStack Start server functions.
  plugins: [tanstackStartCookies()],
})
