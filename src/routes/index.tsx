import { createFileRoute } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'

import { Skeleton } from '../components/ui/skeleton'

// The launchpad placeholder page. The user is watching this in a live preview
// while the agent works, so it tells them that. REPLACE it with the app's real
// landing page as soon as you know what the app is — see "Making it yours" in
// AGENTS.md. Don't keep it as a separate "welcome" screen.
export const Route = createFileRoute('/')({ component: Home })

const WIRED = [
  'Accounts and sign-in',
  'Postgres database',
  'Background jobs',
  'Realtime updates',
]

function Home() {
  return (
    <div className="flex flex-col items-center gap-10 py-16 text-center">
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
          An agent is writing the code right now. This preview updates itself as
          files change, so this page will swap out for the real one on its own.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Already wired up
        </p>
        <ul className="grid gap-2 text-left text-sm sm:grid-cols-2">
          {WIRED.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <CheckIcon className="size-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
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
