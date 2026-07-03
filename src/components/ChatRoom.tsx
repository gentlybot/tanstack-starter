import { useEffect, useRef, useState } from 'react'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'

import type { Message } from '../db/schema'

// Client-side of the realtime demo. Connects to the SAME ORIGIN at /ws —
// Vite proxies that to the standalone ws process in dev, and gently/apps.yml
// (or your reverse proxy) routes it in production. The server pushes three
// event types: history (on connect), presence, and message.
type ServerEvent =
  | { type: 'history'; messages: Message[] }
  | { type: 'presence'; count: number }
  | { type: 'message'; message: Message }

type Status = 'connecting' | 'open' | 'closed'

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([])
  const [online, setOnline] = useState(0)
  const [status, setStatus] = useState<Status>('connecting')
  const [author, setAuthor] = useState(
    () => `guest-${Math.floor(Math.random() * 1000)}`,
  )
  const [text, setText] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

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
        const payload = JSON.parse(event.data as string) as ServerEvent
        if (payload.type === 'history') setMessages(payload.messages)
        if (payload.type === 'presence') setOnline(payload.count)
        if (payload.type === 'message')
          setMessages((current) => [...current, payload.message])
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

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  function send(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(JSON.stringify({ author, text: trimmed }))
    setText('')
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className="max-w-40"
            aria-label="Your name"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={status === 'open' ? 'default' : 'destructive'}>
              {status === 'open' ? `${online} online` : status}
            </Badge>
          </div>
        </div>

        <div
          ref={listRef}
          className="h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3"
        >
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {status === 'open'
                ? 'No messages yet — say something. Open a second tab to see realtime.'
                : 'Connecting… if this persists, is the ws server running? (npm run ws)'}
            </p>
          )}
          {messages.map((message) => (
            <div key={message.id} className="text-sm">
              <span className="font-medium">{message.author}</span>{' '}
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
              <p className="text-foreground/90">{message.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={send} className="flex gap-2">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type a message…"
            aria-label="Message"
          />
          <Button type="submit" disabled={status !== 'open' || !text.trim()}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
