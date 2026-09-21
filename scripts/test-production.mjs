import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import pg from 'pg'
import WebSocket from 'ws'

// Intentionally requires a separate URL: never migrate a developer's database.
const databaseUrl = process.env.DATABASE_URL_TEST
assert(databaseUrl, 'Set DATABASE_URL_TEST to a fresh, disposable database')
const database = new pg.Client({ connectionString: databaseUrl })
const children = []
const origin = 'http://127.0.0.1:43170'
const env = {
  ...process.env,
  NODE_ENV: 'production',
  HOST: '127.0.0.1',
  PORT: '43170',
  WS_PORT: '43171',
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
  BETTER_AUTH_URL: origin,
}

function start(command, args) {
  const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
  const state = { child, output: '', done: once(child, 'exit') }
  // Register the rejection handler immediately, including failed process starts.
  void state.done.catch(() => {})
  for (const pipe of [child.stdout, child.stderr]) {
    pipe.on('data', (data) => {
      state.output += data.toString()
    })
  }
  children.push(state)
  return state
}

async function waitFor(check, state) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    assert(state.child.exitCode === null, state.output)
    if (await check()) return
    await delay(100)
  }
  throw new Error(`Production readiness timed out:\n${state.output}`)
}

async function healthy(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1_000) })).ok
  } catch {
    return false
  }
}

try {
  await database.connect()
  const tables = await database.query(
    "select table_name from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema')",
  )
  assert.equal(tables.rowCount, 0, 'Refusing to test a non-empty database')
  const migration = start('npm', ['run', 'db:migrate'])
  assert.equal((await migration.done)[0], 0, migration.output)

  const web = start(process.execPath, ['.output/server/index.mjs'])
  const ws = start(process.execPath, ['dist/processes/ws.mjs'])
  const worker = start(process.execPath, ['dist/processes/worker.mjs'])
  await Promise.all([
    waitFor(() => healthy(`${origin}/api/health`), web),
    waitFor(() => healthy('http://127.0.0.1:43171/health'), ws),
    waitFor(() => worker.output.includes('[worker] ready'), worker),
  ])
  assert.equal(
    (await database.query('select count(*) from "user"')).rows[0].count,
    '0',
  )
  assert.equal((await fetch(`${origin}/signup`)).status, 200)
  const signup = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({
      name: 'Production check',
      email: 'production-check@example.test',
      password: randomBytes(24).toString('hex'),
    }),
  })
  assert.equal(signup.status, 200, await signup.text())
  assert.equal(
    (await database.query('select count(*) from "user"')).rows[0].count,
    '1',
  )

  const socket = new WebSocket('ws://127.0.0.1:43171/ws')
  try {
    const [message] = await once(socket, 'message', {
      signal: AbortSignal.timeout(5_000),
    })
    assert.equal(JSON.parse(message.toString()).type, 'presence')
  } finally {
    socket.terminate()
  }

  for (const state of [web, ws, worker]) {
    state.child.kill('SIGTERM')
    const result = await Promise.race([
      state.done,
      delay(15_000, undefined, { ref: false }),
    ])
    assert(result, 'Process did not stop within 15 seconds')
    assert.equal(result[0], 0, state.output)
  }
  console.log(
    'Production smoke passed: migration, readiness, signup, WebSocket, worker, shutdown',
  )
} finally {
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGKILL')
  }
  await database.end()
}
