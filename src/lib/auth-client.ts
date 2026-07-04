import { createAuthClient } from 'better-auth/react'

// Browser-side auth client. Talks to the /api/auth/* endpoints mounted by
// src/routes/api/auth/$.ts. Use this from components:
//
//   await authClient.signIn.email({ email, password })
//   await authClient.signUp.email({ name, email, password })
//   await authClient.signOut()
//
// After any of these, call router.invalidate() so loaders (and the session in
// router context) refresh — see src/routes/login.tsx for the pattern.

export const authClient = createAuthClient()
