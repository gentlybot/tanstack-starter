import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
    // Bind all interfaces and accept any Host header so the dev server works
    // behind proxies/sandboxes (gently, containers, tunnels) as well as
    // localhost.
    host: '0.0.0.0',
    allowedHosts: true,
    // Realtime lives in the standalone ws process (src/ws/server.ts). The
    // client always connects same-origin to /ws; in dev this proxy forwards
    // the upgrade to that process. Keep the port in sync with WS_PORT.
    proxy: {
      '/ws': { target: 'http://localhost:3001', ws: true },
    },
  },
})

export default config
