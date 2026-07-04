import { Link, createFileRoute } from '@tanstack/react-router'

import { Button } from '../components/ui/button'
import { APP_DESCRIPTION, APP_NAME } from '../lib/app'

// The launchpad placeholder page. When building an app on this starter,
// REPLACE this with the app's real landing/home page (and rename the app in
// src/lib/app.ts) — see "Making it yours" in AGENTS.md.
export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { session } = Route.useRouteContext()

  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        {APP_DESCRIPTION}
      </p>
      {session?.user ? (
        <p className="text-sm text-muted-foreground">
          Signed in as{' '}
          <span className="font-medium text-foreground">
            {session.user.email}
          </span>
          . Your app goes here.
        </p>
      ) : (
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/signup">Create an account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
