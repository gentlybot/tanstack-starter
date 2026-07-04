import { APP_NAME } from './app'

// Per-route <head> metadata. Use in any route's `head`:
//
//   export const Route = createFileRoute('/pricing')({
//     head: () => ({ meta: seo({ title: 'Pricing', description: '…' }) }),
//   })
//
// Titles render as "<title> · <APP_NAME>"; the root route sets the default.

export function seo({
  title,
  description,
  image,
}: {
  title?: string
  description?: string
  image?: string
}) {
  const fullTitle = title ? `${title} · ${APP_NAME}` : APP_NAME
  return [
    { title: fullTitle },
    // Open Graph tags use `property` (per the OG spec); plain meta and
    // twitter tags use `name`.
    { property: 'og:title', content: fullTitle },
    ...(description
      ? [
          { name: 'description', content: description },
          { property: 'og:description', content: description },
        ]
      : []),
    ...(image
      ? [
          { property: 'og:image', content: image },
          { name: 'twitter:card', content: 'summary_large_image' },
        ]
      : []),
  ]
}
