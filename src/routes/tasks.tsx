import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createTask, listTasks } from '../functions/tasks'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'

import type { Task, TaskStatus } from '../db/schema'

// The full database + background-job loop: creating a task inserts a row AND
// enqueues a pg-boss job (src/functions/tasks.ts). The worker process picks
// it up, "works" for a few seconds, and marks it done. The query below polls
// while any task is still in flight, so you can watch the status change.
export const Route = createFileRoute('/tasks')({
  loader: () => listTasks(),
  component: TasksPage,
})

const statusVariant: Record<TaskStatus, 'secondary' | 'default' | 'outline'> = {
  pending: 'outline',
  processing: 'secondary',
  done: 'default',
}

function TasksPage() {
  const initial = Route.useLoaderData()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks(),
    initialData: initial,
    // Poll while any task is still being processed by the worker. Keep
    // polling even when the window is hidden/unfocused — without this the
    // demo looks frozen if you watch it from a background window.
    refetchInterval: (query) =>
      query.state.data?.some((task) => task.status !== 'done') ? 1000 : false,
    refetchIntervalInBackground: true,
  })

  const create = useMutation({
    mutationFn: (newTitle: string) => createTask({ data: { title: newTitle } }),
    onSuccess: () => {
      setTitle('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Each task is a database row plus a background job. Add one and watch
          the worker move it from <em>pending</em> → <em>processing</em> →{' '}
          <em>done</em>. If it never leaves pending, the worker isn&apos;t
          running (
          <code className="rounded bg-muted px-1 py-0.5">npm run worker</code>).
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (title.trim()) create.mutate(title)
        }}
      >
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          aria-label="Task title"
        />
        <Button type="submit" disabled={create.isPending || !title.trim()}>
          {create.isPending ? 'Adding…' : 'Add task'}
        </Button>
      </form>

      <div className="space-y-2">
        {tasksQuery.data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No tasks yet — add one above.
            </CardContent>
          </Card>
        )}
        {tasksQuery.data.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            #{task.id} · created {new Date(task.createdAt).toLocaleTimeString()}
            {task.completedAt &&
              ` · completed ${new Date(task.completedAt).toLocaleTimeString()}`}
          </p>
        </div>
        <Badge variant={statusVariant[task.status]}>{task.status}</Badge>
      </CardContent>
    </Card>
  )
}
