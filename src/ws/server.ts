// Standalone WebSocket server: `npm run ws`.
//
// TanStack Start has no built-in WebSocket support, so realtime runs as its
// own small process — same pattern as the background worker. Clients always
// connect to the SAME ORIGIN at /ws: in dev, Vite proxies /ws here (see
// vite.config.ts); on gently, gently/apps.yml routes /ws to this process; in
// any other production setup, point your reverse proxy's /ws at this port.
//
// This is a ready skeleton: it tracks presence and gives you `broadcast()`.
// Add your app's event types to ServerEvent/ClientEvent and handle them in
// the `message` listener — see docs/recipes/realtime.md for the full pattern
// (including the client side). Persist anything that must survive a reload
// to Postgres: realtime is the transport, the database is the truth.

import '../server/load-env'

import { createServer } from 'node:http'

import { WebSocketServer } from 'ws'

// Events the server sends to clients. Add your own variants.
export type ServerEvent = { type: 'presence'; count: number }

// Events clients send to the server. Add your own variants.
export type ClientEvent = never

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
    let payload: { type?: unknown }
    try {
      payload = JSON.parse(raw.toString())
    } catch {
      return // ignore malformed frames
    }

    // Handle ClientEvent variants here:
    // switch (payload.type) {
    //   case 'my-event': { ... broadcast({ type: '…', … }); break }
    // }
    void payload
  })

  socket.on('close', () => broadcast(presence()))
})

server.listen(port, () => {
  console.log(`[ws] listening on :${port} (WebSocket path: /ws)`)
})
