import { Link, createFileRoute } from '@tanstack/react-router'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'

export const Route = createFileRoute('/')({ component: Home })

const features = [
  'TanStack Start (React 19, SSR, file-based routing)',
  'TanStack Query for client data',
  'Postgres + Drizzle ORM with SQL migrations',
  'Background jobs via pg-boss — no Redis needed',
  'Realtime WebSockets with a standalone ws process',
  'Tailwind CSS v4 + shadcn/ui components',
]

function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <Badge variant="secondary">Starter template</Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          Everything a real app grows into, already wired together.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          A full-stack TanStack Start app with a database, migrations,
          background jobs, and realtime — each core pattern demonstrated exactly
          once, ready to build on.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/tasks">Try the tasks demo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/chat">Open the chat demo</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/tasks" className="group">
          <Card className="h-full transition-colors group-hover:border-ring">
            <CardHeader>
              <CardTitle>Database + background jobs</CardTitle>
              <CardDescription>
                A server function inserts a row and enqueues a pg-boss job; the
                worker processes it while the page polls until it&apos;s done.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/chat" className="group">
          <Card className="h-full transition-colors group-hover:border-ring">
            <CardHeader>
              <CardTitle>Realtime WebSockets</CardTitle>
              <CardDescription>
                Messages broadcast to every open tab over a WebSocket and are
                saved to Postgres, so history survives a reload.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">In the box</h2>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Read <code className="rounded bg-muted px-1.5 py-0.5">AGENTS.md</code>{' '}
          for the conventions this codebase follows, then start editing{' '}
          <code className="rounded bg-muted px-1.5 py-0.5">src/routes/</code>.
        </p>
      </section>
    </div>
  )
}
