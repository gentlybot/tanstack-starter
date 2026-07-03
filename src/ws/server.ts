// Standalone WebSocket server: `npm run ws`.
//
// TanStack Start has no built-in WebSocket support, so realtime runs as its
// own small process — same pattern as the background worker. Clients always
// connect to the SAME ORIGIN at /ws: in dev, Vite proxies /ws here (see
// vite.config.ts); on gently, gently/apps.yml routes /ws to this process; in
// any other production setup, point your reverse proxy's /ws at this port.
//
// The chat protocol: on connect the server sends recent history and a
// presence count; each incoming message is persisted to Postgres, then
// broadcast to every connected client. Persisting means history survives a
// reload — realtime is the transport, the database is the truth.

import '../server/load-env'

import { createServer } from 'node:http'

import { desc } from 'drizzle-orm'
import { WebSocketServer } from 'ws'

import { db } from '../db/index'
import { messages } from '../db/schema'

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

function broadcast(payload: object) {
  const data = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(data)
  }
}

function presence() {
  return { type: 'presence', count: wss.clients.size }
}

wss.on('connection', async (socket) => {
  // Send the last 50 messages (oldest-first) to the client that just joined.
  const history = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.id))
    .limit(50)
  socket.send(JSON.stringify({ type: 'history', messages: history.reverse() }))

  // Tell everyone (including the newcomer) the updated online count.
  broadcast(presence())

  socket.on('message', async (raw) => {
    let payload: { author?: unknown; text?: unknown }
    try {
      payload = JSON.parse(raw.toString())
    } catch {
      return
    }

    const author =
      typeof payload.author === 'string' ? payload.author.slice(0, 40) : 'anon'
    const text =
      typeof payload.text === 'string' ? payload.text.trim().slice(0, 1000) : ''
    if (!text) return

    // Persist, then broadcast the stored row (with its id + timestamp).
    const [row] = await db.insert(messages).values({ author, text }).returning()
    broadcast({ type: 'message', message: row })
  })

  socket.on('close', () => broadcast(presence()))
})

server.listen(port, () => {
  console.log(`[ws] listening on :${port} (WebSocket path: /ws)`)
})
