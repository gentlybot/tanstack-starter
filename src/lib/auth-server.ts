import { redirect } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from './auth'

// Server-side session access. Two entry points:
//
// - `getSession` (server function): called from route `beforeLoad` /
//   loaders. The root route puts its result into router context, so any
//   route can read `context.session` — see src/routes/__root.tsx.
//
// - `requireUser` (server-only helper): call it FIRST in every server
//   function handler that reads or writes user-owned data, then filter every
//   query by `user.id`. It redirects to /login when there is no session.
//   This is the data-scoping rule — see AGENTS.md.
//
// requireUser is wrapped in createServerOnlyFn so the compiler strips its
// body (and the `auth` → db → pg import chain) from the client bundle.
// Without it, importing this file from client-reachable code pulls the
// Postgres driver into the browser and crashes hydration.

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    return auth.api.getSession({ headers: getRequestHeaders() })
  },
)

export const requireUser = createServerOnlyFn(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) {
    throw redirect({ to: '/login' })
  }
  return session.user
})
