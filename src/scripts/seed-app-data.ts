/**
 * App-specific seed hooks.
 *
 * Both hooks intentionally seed nothing in the launchpad. Add only
 * deterministic, idempotent records here: stable reference data in production,
 * and realistic demo scenarios in non-production environments.
 */

export type SeedTarget = 'production' | 'non-production'

export function resolveSeedTarget(nodeEnv: string | undefined): SeedTarget {
  return nodeEnv === 'production' ? 'production' : 'non-production'
}

export function seedProductionData(): Promise<void> {
  // Add required production reference data here. Never add demo users or
  // synthetic customer data to this hook.
  return Promise.resolve()
}

export function seedNonProductionData(_context: {
  devUserId: string
}): Promise<void> {
  // Add realistic demo records here, owned by context.devUserId where
  // applicable, so a fresh preview opens on meaningful product state.
  return Promise.resolve()
}
