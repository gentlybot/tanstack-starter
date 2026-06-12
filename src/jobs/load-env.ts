// Vite loads .env.local for the web app; the worker runs outside Vite, so it
// loads env itself. No-op when the files don't exist (e.g. on gently, where
// env comes from gently/apps.yml).
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
