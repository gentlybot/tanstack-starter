# Production deployment

Use Node 22 or later and PostgreSQL 17. The included Dockerfile builds one
image for three separate processes. Build it without credentials or a database:

```sh
docker build -t app .
```

| Process   | Command                          | Port                           | Readiness                                                                |
| --------- | -------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Web       | `node .output/server/index.mjs`  | `PORT=3000`, `HOST=0.0.0.0`    | `GET /api/health` checks the database; 200 when reachable, 503 otherwise |
| WebSocket | `node dist/processes/ws.mjs`     | `WS_PORT=3001`, all interfaces | `GET /health` returns 200                                                |
| Worker    | `node dist/processes/worker.mjs` | None                           | Connects to Postgres and logs `[worker] ready`                           |

Route `/` to the web process and `/ws` (including WebSocket upgrades) to the
WebSocket process. The Vite development proxy is not part of the production
server. Each process handles termination separately.

Set these runtime variables:

- `NODE_ENV=production` for all processes.
- `DATABASE_URL` for the web process, worker and migration command. Use the
  Postgres service hostname and the same generated application password in
  both the database configuration and this URL.
- `BETTER_AUTH_SECRET`: a separately generated signing key, retained across
  releases. Never reuse the database password or the development key.
- `BETTER_AUTH_URL`: the deployment's public HTTPS origin, for authentication
  behind ingress. In a Gently recipe use `{{deployment.URL}}`.
- `BETTER_AUTH_ALLOWED_HOSTS`: optional comma-separated hostnames when the app
  is served from multiple approved domains. Keep `BETTER_AUTH_URL` as the
  canonical fallback. Sessions remain host-local unless you deliberately
  configure Better Auth's cross-subdomain cookie support.

After Postgres is ready, run `npm run db:migrate` once using the application
image and runtime `DATABASE_URL`, before starting the app processes. For the
first deployment use an empty database. Review later SQL changes before
allowing migrations during rolling releases.

`NODE_ENV=production npm run db:seed` is safe to run when the app needs
idempotent production reference data: it invokes only `seedProductionData`,
which is empty by default. It never creates the development account or demo
records. New users create their own accounts at `/signup`.
Postgres needs a persistent volume; application containers do not.

## Local production check

```sh
npm ci
npm run build
# Supply a fresh, disposable PostgreSQL database; this check applies migrations
# and creates an account. It refuses an existing application database.
DATABASE_URL_TEST=postgres://... npm run test:production
```

The check starts the built web, WebSocket and worker processes, checks HTTP
readiness, verifies account creation and WebSocket connectivity, and stops all
three processes. CI runs the same check with a disposable Postgres service.

Projects created before these files were added keep their own code history.
Add the Nitro Vite plugin, build scripts, runtime commands and deployment
configuration to those projects in a normal reviewed change; updating the
template does not replace an existing project's files.
