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
  const fallback = configured(env.BETTER_AUTH_URL)
  const allowedHosts = (configured(env.BETTER_AUTH_ALLOWED_HOSTS) ?? '')
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

/**
 * Remove origin env vars that are blank or still unrendered `{{ gently.* }}`
 * templates. Better Auth reads BETTER_AUTH_URL from process.env on its own
 * whenever no explicit baseURL is passed, so passing `undefined` from
 * resolveAuthBaseURL is not enough: the placeholder itself has to go.
 */
export function clearUnconfiguredAuthEnv(env: NodeJS.ProcessEnv): void {
  for (const key of ['BETTER_AUTH_URL', 'BETTER_AUTH_ALLOWED_HOSTS']) {
    if (key in env && configured(env[key]) === undefined) delete env[key]
  }
}

/**
 * An env value, or undefined when it is blank or still an unrendered
 * `{{ gently.* }}` template. Gently fills those templates with the sandbox's
 * routed origin only once a sandbox exists; while the prepared image is built
 * (where `npm run db:seed` runs) there is no origin yet. Treating the
 * placeholder as unset lets Better Auth fall back to request inference
 * instead of rejecting it as an invalid base URL.
 */
function configured(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || /\{\{.*\}\}/.test(trimmed)) return undefined
  return trimmed
}
