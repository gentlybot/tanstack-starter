# Add a realtime feature

Use this when every connected browser must see a change instantly — live
feeds, presence, notifications, collaborative UI. Realtime runs as a
standalone WebSocket process (`src/ws/server.ts`, `npm run ws`) because
TanStack Start has no built-in WebSocket support. Clients always connect to
the SAME ORIGIN at `/ws`: in dev the Vite proxy forwards it to :3001
(`vite.config.ts`), on gently `gently/apps.yml` runs the `ws` app — both are
already wired, nothing to add. Realtime is the transport, the database is the
truth: persist anything that must survive a reload to Postgres. Worked example
below: a live activity feed (room-less broadcast messages).

## 1. Extend the event types and handle the client event

**`src/ws/server.ts`** (replace the whole file)

```ts
// Standalone WebSocket server: `npm run ws`.
//
// TanStack Start has no built-in WebSocket support, so realtime runs as its
// own small process — same pattern as the background worker. Clients always
// connect to the SAME ORIGIN at /ws: in dev, Vite proxies /ws here (see
// vite.config.ts); on gently, gently/apps.yml routes /ws to this process; in
// any other production setup, point your reverse proxy's /ws at this port.
//
// Protocol: JSON frames tagged by `type`. The server tracks presence and
// rebroadcasts every activity event to all connected clients. Persist
// anything that must survive a reload to Postgres: realtime is the transport,
// the database is the truth.

import '../server/load-env'

import { createServer } from 'node:http'

import { WebSocketServer } from 'ws'

// Events the server sends to clients. Add your own variants.
export type ServerEvent =
  | { type: 'presence'; count: number }
  | { type: 'activity'; user: string; message: string; at: string }

// Events clients send to the server. Add your own variants.
export type ClientEvent = { type: 'activity'; user: string; message: string }

const port = Number(process.env.WS_PORT ?? 3001)

// A plain HTTP server underneath so the process is health-checkable
// (GET / → 200) — gently and most orchestrators probe this.
const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, clients: wss.clients.size }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server, path: '/ws' })

export function broadcast(payload: ServerEvent) {
  const data = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(data)
  }
}

function presence(): ServerEvent {
  return { type: 'presence', count: wss.clients.size }
}

wss.on('connection', (socket) => {
  // Tell everyone (including the newcomer) the updated online count.
  broadcast(presence())

  socket.on('message', (raw) => {
    let payload: { type?: unknown; user?: unknown; message?: unknown }
    try {
      payload = JSON.parse(raw.toString())
    } catch {
      return // ignore malformed frames
    }

    // Handle ClientEvent variants here:
    switch (payload.type) {
      case 'activity': {
        // Never trust client input — validate and clamp before broadcasting.
        const user =
          typeof payload.user === 'string' && payload.user.trim()
            ? payload.user.trim().slice(0, 40)
            : 'anon'
        const message =
          typeof payload.message === 'string'
            ? payload.message.trim().slice(0, 500)
            : ''
        if (!message) return
        broadcast({
          type: 'activity',
          user,
          message,
          at: new Date().toISOString(),
        })
        break
      }
    }
  })

  socket.on('close', () => broadcast(presence()))
})

server.listen(port, () => {
  console.log(`[ws] listening on :${port} (WebSocket path: /ws)`)
})
```

This example is ephemeral — events vanish on reload. If the feature must
survive a reload, persist before broadcasting: the ws process imports `db`
exactly like a job handler does (`import { db } from '../db/index'` plus your
table from `../db/schema`). Make the `message` listener `async`, insert the
row, then broadcast the STORED row (it carries the real id + timestamp), and
send recent history to each newly connected socket:

```ts
// Variation for persisted events (adapt into the file above; needs a table
// in src/db/schema.ts + migration — see docs/recipes/crud.md):
const [row] = await db.insert(activity).values({ user, message }).returning()
broadcast({ type: 'activity', ...row })
```

## 2. Add the generic client hook

**`src/lib/use-websocket.ts`** (new file)

```ts
import { useEffect, useRef, useState } from 'react'

// Generic client for the standalone WebSocket server (src/ws/server.ts).
// Connects to the SAME ORIGIN at /ws (Vite proxy in dev, gently/apps.yml in
// sandboxes), parses JSON frames, auto-reconnects 2s after a drop, and cleans
// up on unmount. Type it with the event unions from the server:
//
//   const { status, send } = useWebSocket<ServerEvent, ClientEvent>(onEvent)

export type WebSocketStatus = 'connecting' | 'open' | 'closed'

export function useWebSocket<TServerEvent, TClientEvent = never>(
  onEvent: (event: TServerEvent) => void,
) {
  const [status, setStatus] = useState<WebSocketStatus>('connecting')
  const socketRef = useRef<WebSocket | null>(null)

  // Track the latest callback without making it an effect dependency — the
  // socket must survive re-renders and only close on unmount.
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let socket: WebSocket
    let retry: ReturnType<typeof setTimeout>
    let disposed = false

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`)
      socketRef.current = socket
      setStatus('connecting')

      socket.onopen = () => setStatus('open')
      socket.onmessage = (event) => {
        let payload: TServerEvent
        try {
          payload = JSON.parse(event.data as string) as TServerEvent
        } catch {
          return // ignore malformed frames
        }
        onEventRef.current(payload)
      }
      socket.onclose = () => {
        setStatus('closed')
        if (!disposed) retry = setTimeout(connect, 2000)
      }
    }

    connect()
    return () => {
      disposed = true
      clearTimeout(retry)
      socket.close()
    }
  }, [])

  /** Send a client event. Returns false if the socket isn't open. */
  function send(event: TClientEvent): boolean {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false
    socketRef.current.send(JSON.stringify(event))
    return true
  }

  return { status, send }
}
```

## 3. Use the hook in a component

**`src/components/ActivityFeed.tsx`** (new file)

```tsx
import { useState } from 'react'

import { useWebSocket } from '../lib/use-websocket'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'

import type { ClientEvent, ServerEvent } from '../ws/server'

// `import type` is erased at build time, so pulling the event unions from
// src/ws/server.ts is safe — no server code reaches the browser.

type ActivityEvent = Extract<ServerEvent, { type: 'activity' }>

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [online, setOnline] = useState(0)
  const [user] = useState(() => `guest-${Math.floor(Math.random() * 1000)}`)
  const [message, setMessage] = useState('')

  const { status, send } = useWebSocket<ServerEvent, ClientEvent>((event) => {
    if (event.type === 'presence') setOnline(event.count)
    if (event.type === 'activity')
      setEvents((current) => [...current.slice(-49), event])
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    if (send({ type: 'activity', user, message: trimmed })) setMessage('')
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">You are {user}</span>
          <Badge variant={status === 'open' ? 'default' : 'destructive'}>
            {status === 'open' ? `${online} online` : status}
          </Badge>
        </div>

        <div className="h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
          {events.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {status === 'open'
                ? 'No activity yet — send something. Open a second tab to see realtime.'
                : 'Connecting… if this persists, is the ws server running? (npm run ws)'}
            </p>
          )}
          {events.map((entry, index) => (
            <div key={`${entry.at}-${index}`} className="text-sm">
              <span className="font-medium">{entry.user}</span>{' '}
              <span className="text-xs text-muted-foreground">
                {new Date(entry.at).toLocaleTimeString()}
              </span>
              <p className="text-foreground/90">{entry.message}</p>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Say something…"
            aria-label="Message"
          />
          <Button type="submit" disabled={status !== 'open' || !message.trim()}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

## 4. Mount it on a page

**`src/routes/activity.tsx`** (new file)

```tsx
import { createFileRoute } from '@tanstack/react-router'

import ActivityFeed from '../components/ActivityFeed'

// The WebSocket connects inside ActivityFeed's effect (a socket needs a
// browser), so SSR just renders the empty shell.
export const Route = createFileRoute('/activity')({ component: ActivityPage })

function ActivityPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Open this page in two tabs — events broadcast to every connected
          client over a WebSocket.
        </p>
      </div>
      <ActivityFeed />
    </div>
  )
}
```

To put it in the nav, add `{ to: '/activity', label: 'Activity' }` to the
`links` array in `src/components/Header.tsx`.

## Verify

Terminal 1 — the WebSocket server:

```bash
npm run ws
```

Expected output:

```
[ws] listening on :3001 (WebSocket path: /ws)
```

Terminal 2 — the web app:

```bash
npm run dev
```

Open http://localhost:3000/activity in TWO tabs. Expected: both tabs show the
badge `2 online`; sending a message in one tab makes it appear in both
instantly. Kill `npm run ws` and the badge flips to `closed`; restart it and
the client reconnects within ~2 seconds. Health check:

```bash
curl -s localhost:3001/health
```

Expected: `{"ok":true,"clients":2}`.

Then run `npm run typecheck` and `npm run lint` to confirm the new files are
clean.
