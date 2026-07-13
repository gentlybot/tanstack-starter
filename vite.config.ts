/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    // A single React instance, always. Without this, Vite can serve
    // @tanstack/react-query raw from node_modules (importing its own CJS
    // react) while react-dom comes prebundled — two React copies, hooks
    // crash, and query subscriptions silently die.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  server: {
    // Bind all interfaces and allow only the proxy/sandbox hosts supplied by
    // the runtime. Undefined preserves Vite's safe localhost defaults.
    host: '0.0.0.0',
    allowedHosts: allowedHosts?.length ? allowedHosts : undefined,
    // Realtime lives in the standalone ws process (src/ws/server.ts). The
    // client always connects same-origin to /ws; in dev this proxy forwards
    // the upgrade to that process. Keep the port in sync with WS_PORT.
    proxy: {
      '/ws': { target: 'http://localhost:3001', ws: true },
    },
  },
  test: {
    // Fast default for schema/pure-function tests. Component tests opt into
    // the DOM per-file with a `// @vitest-environment jsdom` pragma.
    environment: 'node',
    // Required for @testing-library/react's automatic between-test cleanup
    // (it registers afterEach(cleanup) only when a global afterEach exists).
    globals: true,
  },
})

export default config
