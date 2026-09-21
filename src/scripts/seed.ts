// Environment-aware, idempotent seed entry point: `npm run db:seed`.
//
// In non-production environments it creates a known development account:
//
//   email:    dev@example.com
//   password: password1234
//
// In production it never creates that account. Both environments have an
// app-data hook in seed-app-data.ts, even while those hooks seed nothing.
// Keep every seed idempotent: gently runs this command on every sandbox setup.

import '../server/load-env'

import { eq } from 'drizzle-orm'

import { db } from '../db/index'
import { user } from '../db/schema'
import { auth } from '../lib/auth'
import {
  resolveSeedTarget,
  seedNonProductionData,
  seedProductionData,
} from './seed-app-data'

export const DEV_USER = {
  name: 'Dev User',
  email: 'dev@example.com',
  password: 'password1234',
}

async function ensureDevelopmentUser(): Promise<string> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEV_USER.email))
    .limit(1)

  if (existing.length > 0) {
    console.log(`[seed] ${DEV_USER.email} already exists — nothing to do`)
  } else {
    await auth.api.signUpEmail({ body: DEV_USER })
    console.log(`[seed] created ${DEV_USER.email}`)
  }

  const seeded = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEV_USER.email))
    .limit(1)
  const devUser = seeded.at(0)
  if (!devUser) throw new Error('development user was not created')
  return devUser.id
}

async function main() {
  const target = resolveSeedTarget(process.env.NODE_ENV)
  console.log(`[seed] target: ${target}`)

  if (target === 'production') {
    await seedProductionData()
  } else {
    const devUserId = await ensureDevelopmentUser()
    await seedNonProductionData({ devUserId })
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('[seed] failed', error)
  process.exit(1)
})
