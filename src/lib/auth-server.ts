import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from './auth'

// Server-side session access. Two entry points:
//
// - `getSession` (server function): called from route `beforeLoad` /
//   loaders. The root route puts its result into router context, so any
//   route can read `context.session` — see src/routes/__root.tsx.
//
// - `requireUser` (plain server helper): call it FIRST in every server
//   function handler that reads or writes user-owned data, then filter every
//   query by `user.id`. It redirects to /login when there is no session.
//   This is the data-scoping rule — see AGENTS.md.

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    return auth.api.getSession({ headers: getRequestHeaders() })
  },
)

export async function requireUser() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) {
    throw redirect({ to: '/login' })
  }
  return session.user
}
