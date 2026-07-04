# Server functions

One file per domain area (e.g. `posts.ts`, `settings.ts`). Each server
function that reads or writes user-owned data must call `requireUser()` from
`src/lib/auth-server.ts` first and filter every query by `user.id`.

See `docs/recipes/crud.md` for the complete canonical example.
