import { build } from 'esbuild'

// Bundle local imports, but retain production packages in node_modules.
// These processes run independently of the web server and never use watch mode.
await build({
  entryPoints: { worker: 'src/jobs/worker.ts', ws: 'src/ws/server.ts' },
  outdir: 'dist/processes',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
})
