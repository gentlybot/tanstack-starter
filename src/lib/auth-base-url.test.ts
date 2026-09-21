import { describe, expect, it } from 'vitest'

import { resolveAuthBaseURL } from './auth-base-url'

describe('resolveAuthBaseURL', () => {
  it('uses the canonical URL for a single-domain deployment', () => {
    expect(
      resolveAuthBaseURL({ BETTER_AUTH_URL: 'https://app.example.com' }),
    ).toBe('https://app.example.com')
  })

  it('builds an allowlisted dynamic base URL for multiple domains', () => {
    expect(
      resolveAuthBaseURL({
        BETTER_AUTH_URL: 'https://app.example.com',
        BETTER_AUTH_ALLOWED_HOSTS:
          'app.example.com, www.example.com, *.preview.example.com',
      }),
    ).toEqual({
      allowedHosts: [
        'app.example.com',
        'www.example.com',
        '*.preview.example.com',
      ],
      protocol: 'https',
      fallback: 'https://app.example.com',
    })
  })

  it('leaves request inference available when no origin policy is configured', () => {
    expect(resolveAuthBaseURL({})).toBeUndefined()
  })
})
