import { describe, expect, it } from 'vitest'

import { clearUnconfiguredAuthEnv, resolveAuthBaseURL } from './auth-base-url'

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

  it('treats unrendered Gently templates as unset (prepared-image builds have no origin yet)', () => {
    expect(
      resolveAuthBaseURL({
        BETTER_AUTH_URL: '{{ gently.GENTLY_ENVIRONMENT_URL }}',
        BETTER_AUTH_ALLOWED_HOSTS: '{{ gently.GENTLY_DOMAIN }}',
      }),
    ).toBeUndefined()
  })

  it('treats blank values as unset', () => {
    expect(
      resolveAuthBaseURL({
        BETTER_AUTH_URL: ' ',
        BETTER_AUTH_ALLOWED_HOSTS: '',
      }),
    ).toBeUndefined()
  })

  it('clears unrendered or blank origin env vars and keeps real ones', () => {
    const env: NodeJS.ProcessEnv = {
      BETTER_AUTH_URL: '{{ gently.GENTLY_ENVIRONMENT_URL }}',
      BETTER_AUTH_ALLOWED_HOSTS: ' ',
      OTHER: '{{ gently.GENTLY_DOMAIN }}',
    }
    clearUnconfiguredAuthEnv(env)
    expect(env).toEqual({ OTHER: '{{ gently.GENTLY_DOMAIN }}' })

    const real: NodeJS.ProcessEnv = {
      BETTER_AUTH_URL: 'https://app.example.com',
      BETTER_AUTH_ALLOWED_HOSTS: 'app.example.com',
    }
    clearUnconfiguredAuthEnv(real)
    expect(real).toEqual({
      BETTER_AUTH_URL: 'https://app.example.com',
      BETTER_AUTH_ALLOWED_HOSTS: 'app.example.com',
    })
  })
})
