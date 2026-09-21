export type AuthBaseURL =
  | string
  | {
      allowedHosts: string[]
      protocol: 'http' | 'https' | 'auto'
      fallback?: string
    }
  | undefined

/**
 * Resolve Better Auth's public origin policy.
 *
 * A single-domain deployment can set only BETTER_AUTH_URL. Multi-domain and
 * preview deployments should also provide a comma-separated host allowlist;
 * Better Auth then derives the base URL per request and rejects unknown hosts.
 */
export function resolveAuthBaseURL(env: NodeJS.ProcessEnv): AuthBaseURL {
  const fallback = env.BETTER_AUTH_URL?.trim() || undefined
  const allowedHosts = (env.BETTER_AUTH_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)

  if (allowedHosts.length === 0) return fallback

  return {
    allowedHosts,
    protocol: fallback?.startsWith('https://')
      ? 'https'
      : fallback?.startsWith('http://')
        ? 'http'
        : 'auto',
    ...(fallback ? { fallback } : {}),
  }
}
