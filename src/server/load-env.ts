// Env loading for the standalone processes (worker, ws server) that run
// outside Vite / TanStack Start. The web app doesn't need this — Start loads
// .env files itself. On gently, env comes from gently/apps.yml and these
// files are a harmless no-op.
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })
