import { createFileRoute } from '@tanstack/react-router'

import ChatRoom from '../components/ChatRoom'

// Realtime WebSocket demo. The room itself only renders meaningfully on the
// client (a WebSocket needs a browser); the connection happens inside
// ChatRoom's useEffect, so SSR just renders the empty shell.
export const Route = createFileRoute('/chat')({ component: ChatPage })

function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Open this page in two tabs — messages broadcast to every connected
          client over a WebSocket and are persisted to Postgres, so history
          survives a reload.
        </p>
      </div>
      <ChatRoom />
    </div>
  )
}
