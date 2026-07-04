// Idempotent dev seed: `npm run db:seed`.
// Creates a known dev account you can sign in with immediately:
//
//   email:    dev@example.com
//   password: password1234
//
// Safe to run repeatedly (it no-ops when the user exists) — gently runs it on
// every sandbox setup. Add your app's own seed data below the dev user so a
// fresh environment always has something to look at.

import '../server/load-env'

import { eq } from 'drizzle-orm'

import { db } from '../db/index'
import { user } from '../db/schema'
import { auth } from '../lib/auth'

export const DEV_USER = {
  name: 'Dev User',
  email: 'dev@example.com',
  password: 'password1234',
}

async function main() {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEV_USER.email))
    .limit(1)

  if (existing.length > 0) {
    console.log(`[seed] ${DEV_USER.email} already exists — nothing to do`)
  } else {
    await auth.api.signUpEmail({ body: DEV_USER })
    console.log(
      `[seed] created ${DEV_USER.email} (password: ${DEV_USER.password})`,
    )
  }

  // ── App seed data goes below ──────────────────────────────────────────────
  // Look up the dev user's id and insert demo rows for your tables here,
  // guarded the same way (skip if already present).

  process.exit(0)
}

main().catch((error) => {
  console.error('[seed] failed', error)
  process.exit(1)
})
