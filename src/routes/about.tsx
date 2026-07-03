import { createFileRoute } from '@tanstack/react-router'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'

export const Route = createFileRoute('/about')({ component: AboutPage })

const stack = [
  {
    concern: 'Framework',
    choice: 'TanStack Start (React 19, SSR, Vite)',
    where: 'src/routes/, vite.config.ts',
  },
  {
    concern: 'Routing',
    choice: 'TanStack Router — file-based',
    where: 'src/routes/',
  },
  {
    concern: 'Server RPC',
    choice: 'Server functions (createServerFn)',
    where: 'src/functions/',
  },
  {
    concern: 'HTTP endpoints',
    choice: 'Server routes',
    where: 'src/routes/api/health.ts',
  },
  {
    concern: 'Client data',
    choice: 'TanStack Query',
    where: 'src/routes/tasks.tsx',
  },
  {
    concern: 'Database',
    choice: 'Postgres + Drizzle ORM, SQL migrations',
    where: 'src/db/, drizzle/',
  },
  {
    concern: 'Background jobs',
    choice: 'pg-boss (queues live in Postgres)',
    where: 'src/jobs/',
  },
  {
    concern: 'Realtime',
    choice: 'WebSockets — standalone ws process',
    where: 'src/ws/server.ts, src/components/ChatRoom.tsx',
  },
  {
    concern: 'UI',
    choice: 'Tailwind CSS v4 + shadcn/ui',
    where: 'src/components/ui/, src/styles.css',
  },
]

function AboutPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">The stack</h1>
        <p className="text-sm text-muted-foreground">
          Every core pattern is demonstrated exactly once — extend the app by
          copying the existing example of whatever you&apos;re adding. See{' '}
          <code className="rounded bg-muted px-1 py-0.5">AGENTS.md</code> for
          the full conventions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {stack.map((item) => (
          <Card key={item.concern}>
            <CardHeader className="pb-2">
              <CardDescription>{item.concern}</CardDescription>
              <CardTitle className="text-base">{item.choice}</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs text-muted-foreground">
                {item.where}
              </code>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
