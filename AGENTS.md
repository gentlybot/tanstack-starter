# TanStack Starter — Agent Guide

Full-stack TanStack Start app with Postgres, background jobs, and AI chat
pre-wired. Every core pattern is demonstrated exactly once; extend by copying
the existing example of whatever you're adding.

## Stack

| Concern | Choice | Where |
| --- | --- | --- |
| Framework | TanStack Start (React 19, SSR, Vite) | `src/routes/`, `vite.config.ts` |
| Routing | TanStack Router, file-based | `src/routes/` → `src/routeTree.gen.ts` (generated — never edit) |
| Client data | TanStack Query | `src/integrations/tanstack-query/` |
| Database | Postgres + Drizzle ORM | `src/db/schema.ts`, `src/db/index.ts` |
| Background jobs | pg-boss (queues live in Postgres) | `src/jobs/` |
| AI chat | TanStack AI (Anthropic/OpenAI) | `src/routes/api.chat.ts`, `src/lib/chat-tools.ts` |
| Styling | Tailwind CSS v4 + design tokens | `src/styles.css` (CSS vars like `--sea-ink`) |
| UI components | shadcn (add via `npx shadcn@latest add <component>`) | `src/components/` |
| Lint/format | Biome | `biome.json` |

## Commands

```bash
npm run dev        # web app on :3000
npm run worker     # background job worker (separate process)
npm run db:push    # sync src/db/schema.ts to the database
npm run check      # Biome lint + format check
npm run test       # Vitest
npm run build      # production build
```

`DATABASE_URL` must point at Postgres (see `.env.example`). On gently both
processes, the database, and env injection are declared in `gently/apps.yml`.

## Core rules

- **Server code lives in server functions** (`createServerFn`) or server route
  handlers (`server.handlers` in a route file). Never fetch your own API from
  a loader — call the server function directly. Server-only imports (db,
  pg-boss) are stripped from the client bundle automatically.
- **Routes are files** under `src/routes/`. `tasks.tsx` → `/tasks`,
  `api.chat.ts` → `/api/chat`, `$id.tsx` → path param. The route tree
  regenerates on dev; also via `npm run generate-routes`.
- **Navigate with `<Link to="...">`** from `@tanstack/react-router`, never
  `<a href>` for internal routes — links are type-checked.
- **Schema is the source of truth.** Change `src/db/schema.ts`, run
  `npm run db:push`. Don't write raw SQL migrations by hand.
- **Type safety end-to-end**: don't cast or re-annotate what's already
  inferred (loader data, server fn results, route params).
- Never edit `src/routeTree.gen.ts`.
- Run `npm run check` before considering a change done.

## How to add things (copy the existing example)

- **A page**: new file in `src/routes/`, `createFileRoute`, add a link in
  `src/components/Header.tsx`. Data → `loader` + server function (see
  `src/routes/tasks.tsx`).
- **A table**: add to `src/db/schema.ts`, export inferred types,
  `npm run db:push`.
- **A background job**: queue name + payload type in `src/jobs/queues.ts`,
  handler in `src/jobs/handlers/`, register it in `src/jobs/worker.ts`,
  enqueue from a server function with `enqueue()` (see `process-task`).
  Use a job whenever work is slow, retryable, or shouldn't block a request
  (emails, imports, external APIs).
- **A chat tool**: `toolDefinition()` + `.server()` in
  `src/lib/chat-tools.ts`, add it to the `tools` array in
  `src/routes/api.chat.ts` (see `listTasks`).
- **A TanStack integration** (auth, forms, tables, …):
  `npx @tanstack/cli add <add-on>` — list with
  `npx @tanstack/cli create --list-add-ons`.

## Environment

- `.env.local` (gitignored) for local dev; `.env.example` documents the keys.
- AI chat needs `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`); without one,
  `/chat` shows setup instructions instead of erroring.
- Secrets never go in client code — only `VITE_`-prefixed vars reach the
  browser.

The skill mappings below are maintained by TanStack Intent
(`npx @tanstack/intent@latest sync`) — load a skill with
`npx @tanstack/intent@latest load <use>` when working on the matching area.

<!-- intent-skills:start -->
# Skill mappings - load `use` with `npx @tanstack/intent@latest load <use>`.
skills:
  - when: "Entry point for TanStack AI skills. Routes to chat-experience, tool-calling, media-generation, structured-outputs, adapter-configuration, ag-ui-protocol, middleware, custom-backend-integration, and debug-logging. Use chat() not streamText(), openaiText() not createOpenAI(), toServerSentEventsResponse() not manual SSE, middleware hooks not onEnd callbacks."
    use: "@tanstack/ai#ai-core"
  - when: "Provider adapter selection and configuration: openaiText, anthropicText, geminiText, ollamaText, grokText, groqText, openRouterText, openaiCompatible. Per-model type safety with modelOptions, reasoning/thinking configuration, runtime adapter switching, extendAdapter() for custom models, createModel(). Generic OpenAI-compatible providers (DeepSeek, Together, Fireworks, etc.) via openaiCompatible({ baseURL, apiKey, models }) from @tanstack/ai-openai/compatible. API key env vars: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY/GEMINI_API_KEY, XAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, OLLAMA_HOST."
    use: "@tanstack/ai#ai-core/adapter-configuration"
  - when: "Server-side AG-UI streaming protocol implementation: StreamChunk event types (RUN_STARTED, TEXT_MESSAGE_START/CONTENT/END, TOOL_CALL_START/ARGS/END, RUN_FINISHED, RUN_ERROR, STEP_STARTED/STEP_FINISHED, STATE_SNAPSHOT/DELTA, CUSTOM), toServerSentEventsStream() for SSE format, toHttpStream() for NDJSON format. For backends serving AG-UI events without client packages."
    use: "@tanstack/ai#ai-core/ag-ui-protocol"
  - when: "End-to-end chat implementation: server endpoint with chat() and toServerSentEventsResponse(), client-side useChat hook with fetchServerSentEvents(), message rendering with UIMessage parts, multimodal content, thinking/reasoning display. Covers streaming states, connection adapters, and message format conversions. NOT Vercel AI SDK — uses chat() not streamText()."
    use: "@tanstack/ai#ai-core/chat-experience"
  - when: "Connect useChat to a non-TanStack-AI backend through custom connection adapters. ConnectConnectionAdapter (single async iterable) vs SubscribeConnectionAdapter (separate subscribe/send). Customize fetchServerSentEvents() and fetchHttpStream() with auth headers, custom URLs, and request options. Import from framework package, not @tanstack/ai-client."
    use: "@tanstack/ai#ai-core/custom-backend-integration"
  - when: "Pluggable, category-toggleable debug logging for TanStack AI activities. Toggle with `debug: true | false | DebugConfig` on chat(), summarize(), generateImage(), generateSpeech(), generateTranscription(), generateVideo(). Categories: request, provider, output, middleware, tools, agentLoop, config, errors. Pipe into pino/winston/etc via `debug: { logger }`. Errors log by default even when `debug` is omitted; silence with `debug: false`."
    use: "@tanstack/ai#ai-core/debug-logging"
  - when: "Image, audio, video, speech (TTS), and transcription generation using activity-specific adapters: generateImage() with openaiImage/geminiImage, generateAudio() with geminiAudio/falAudio, generateVideo() with async polling, generateSpeech() with openaiSpeech, generateTranscription() with openaiTranscription. React hooks: useGenerateImage, useGenerateAudio, useGenerateSpeech, useTranscription, useGenerateVideo. TanStack Start server function integration with toServerSentEventsResponse."
    use: "@tanstack/ai#ai-core/media-generation"
  - when: "Chat lifecycle middleware hooks: onConfig, onStart, onChunk, onBeforeToolCall, onAfterToolCall, onUsage, onFinish, onAbort, onError. Use for analytics, event firing, tool caching (toolCacheMiddleware), logging, and tracing. Middleware array in chat() config, left-to-right execution order. NOT onEnd/onFinish callbacks on chat() — use middleware."
    use: "@tanstack/ai#ai-core/middleware"
  - when: "Type-safe JSON schema responses from LLMs using outputSchema on chat() and useChat(). Supports Zod, ArkType, and Valibot schemas. The adapter handles provider-specific strategies transparently — never configure structured output at the provider level. Pass stream:true alongside outputSchema for incremental JSON deltas + a terminal validated object via the `structured-output.complete` event. Every assistant turn in useChat carries its own typed `StructuredOutputPart` on `messages[i].parts`, so multi-turn structured chats preserve history automatically — partial/final derive from the latest assistant turn's part. convertSchemaToJsonSchema() for manual schema conversion."
    use: "@tanstack/ai#ai-core/structured-outputs"
  - when: "Isomorphic tool system: toolDefinition() with Zod schemas, .server() and .client() implementations, passing tools to both chat() on server and useChat/clientTools on client, tool approval flows with needsApproval and addToolApprovalResponse(), lazy tool discovery with lazy:true, rendering ToolCallPart and ToolResultPart in UI."
    use: "@tanstack/ai#ai-core/tool-calling"
  - when: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
    use: "@tanstack/devtools#devtools-app-setup"
  - when: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
    use: "@tanstack/devtools#devtools-marketplace"
  - when: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
    use: "@tanstack/devtools#devtools-plugin-panel"
  - when: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
    use: "@tanstack/devtools#devtools-production"
  - when: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
    use: "@tanstack/devtools-event-client#devtools-bidirectional"
  - when: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
    use: "@tanstack/devtools-event-client#devtools-event-client"
  - when: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
    use: "@tanstack/devtools-event-client#devtools-instrumentation"
  - when: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
    use: "@tanstack/devtools-vite#devtools-vite-plugin"
  - when: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
    use: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
  - when: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
    use: "@tanstack/react-start#react-start"
  - when: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
    use: "@tanstack/react-start#react-start/server-components"
  - when: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
    use: "@tanstack/router-core#router-core"
  - when: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
    use: "@tanstack/router-core#router-core/auth-and-guards"
  - when: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
    use: "@tanstack/router-core#router-core/code-splitting"
  - when: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
    use: "@tanstack/router-core#router-core/data-loading"
  - when: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
    use: "@tanstack/router-core#router-core/navigation"
  - when: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
    use: "@tanstack/router-core#router-core/not-found-and-errors"
  - when: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
    use: "@tanstack/router-core#router-core/path-params"
  - when: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
    use: "@tanstack/router-core#router-core/search-params"
  - when: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
    use: "@tanstack/router-core#router-core/ssr"
  - when: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
    use: "@tanstack/router-core#router-core/type-safety"
  - when: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
    use: "@tanstack/router-plugin#router-plugin"
  - when: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
    use: "@tanstack/start-client-core#start-core"
  - when: "Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via createServerFn and middleware, OAuth authorization-code flow with state and PKCE, password-reset enumeration defense, CSRF for non-GET RPCs, rate limiting auth endpoints, session rotation on privilege change. Pairs with router-core/auth-and-guards for the routing side."
    use: "@tanstack/start-client-core#start-core/auth-server-primitives"
  - when: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
    use: "@tanstack/start-client-core#start-core/deployment"
  - when: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE_ prefix, process.env)."
    use: "@tanstack/start-client-core#start-core/execution-model"
  - when: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
    use: "@tanstack/start-client-core#start-core/middleware"
  - when: "createServerFn (GET/POST), validator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
    use: "@tanstack/start-client-core#start-core/server-functions"
  - when: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
    use: "@tanstack/start-client-core#start-core/server-routes"
  - when: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
    use: "@tanstack/start-server-core#start-server-core"
  - when: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
    use: "@tanstack/virtual-file-routes#virtual-file-routes"
  - when: "Load environment variables from a .env file into process.env for Node.js applications. Use when configuring apps with secrets, setting up local development environments, managing API keys and database uRLs, parsing .env file contents, or populating environment variables programmatically. Always use this skill when the user mentions .env, even for simple tasks like \"set up dotenv\" — the skill contains critical gotchas (encrypted keys, variable expansion, command substitution) that prevent common production issues."
    use: "dotenv#dotenv"
  - when: "Use dotenvx to run commands with environment variables, manage multiple .env files, expand variables, and encrypt env files for safe commits and CI/CD."
    use: "dotenv#dotenvx"
<!-- intent-skills:end -->
