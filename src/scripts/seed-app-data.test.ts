import { describe, expect, it } from 'vitest'

import { resolveSeedTarget } from './seed-app-data'

describe('resolveSeedTarget', () => {
  it('uses the production hook only for an explicit production environment', () => {
    expect(resolveSeedTarget('production')).toBe('production')
  })

  it.each([undefined, '', 'development', 'test'])(
    'treats %s as non-production',
    (nodeEnv) => {
      expect(resolveSeedTarget(nodeEnv)).toBe('non-production')
    },
  )
})
