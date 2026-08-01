import { createFileRoute } from '@tanstack/react-router'

import { Skeleton } from '../components/ui/skeleton'

// The launchpad placeholder page. The user is watching this in a live preview
// while the agent works, so it tells them that — in plain language, for a
// non-technical audience. REPLACE it with the app's real landing page as soon
// as you know what the app is (see "Making it yours" in AGENTS.md). Don't keep
// it as a separate "welcome" screen.
export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="flex flex-col items-center gap-10 py-20 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-foreground" />
        </span>
        Building
      </span>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-balance">
          Your app is being built
        </h1>
        <p className="mx-auto max-w-md text-lg text-pretty text-muted-foreground">
          An agent is working on it right now. This page updates itself as the
          app takes shape — you can leave it open.
        </p>
      </div>

      {/* Suggests a page still filling in. Decorative only. */}
      <div aria-hidden className="w-full max-w-md space-y-3 opacity-50">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-8/12" />
      </div>
    </div>
  )
}
