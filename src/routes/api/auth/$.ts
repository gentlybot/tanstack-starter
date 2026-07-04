import { createFileRoute } from '@tanstack/react-router'

import { auth } from '../../../lib/auth'

// Mounts all better-auth HTTP endpoints (sign-in, sign-up, sign-out, session,
// …) under /api/auth/*. The browser talks to these through the client in
// src/lib/auth-client.ts — you should never need to call them by hand.
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
