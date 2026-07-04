# Forms: the useAppForm pattern

Use this whenever a page collects input — sign-in, create/edit screens, settings. Every form in the app is built with `useAppForm` from `src/components/form.tsx` (TanStack Form + Zod + pre-styled field components): you get schema validation, per-field error display, and a pending-state submit button for free, and the SAME Zod schema validates on the client (form) and on the server (server function), so the two can never disagree. The live in-kit example is `src/routes/login.tsx`; the create/update shapes are in `docs/recipes/crud.md` (steps 6 and 7).

## 1. Anatomy of a form

Three parts: `defaultValues` (the form's shape — every field starts defined, usually `''`/`false`), `validators.onSubmit` (a Zod schema; errors land on the matching field), and `onSubmit` (receives the validated `value`).

```tsx
import { toast } from 'sonner'

import { useAppForm } from '../components/form'
import { createPost, postInputSchema } from '../functions/posts'

function NewPostPage() {
  const router = useRouter()

  const form = useAppForm({
    defaultValues: { title: '', content: '' },
    validators: { onSubmit: postInputSchema },
    onSubmit: async ({ value }) => {
      try {
        const post = await createPost({ data: value })
        toast.success('Post created')
        await router.invalidate()
        await router.navigate({
          to: '/posts/$postId',
          params: { postId: String(post.id) },
        })
      } catch {
        toast.error('Could not create the post')
      }
    },
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.AppField name="title">
        {(field) => <field.TextField label="Title" />}
      </form.AppField>
      <form.AppField name="content">
        {(field) => <field.TextareaField label="Content" rows={8} />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton>Create post</form.SubmitButton>
      </form.AppForm>
    </form>
  )
}
```

The `<form>` element always wires `onSubmit` to `event.preventDefault()` + `form.handleSubmit()`. For an EDIT form, prefill from loader data instead: `defaultValues: { title: post.title, content: post.content }` (see crud.md step 7).

## 2. Field components

Each field is declared with `form.AppField name="…"` and a render callback that picks a pre-styled component. The `name` must be a key of `defaultValues`. Available components (defined in `src/components/form.tsx` — add new ones there, in the `fieldComponents` registry):

- `field.TextField` — `<Input>` with a label. Accepts any `Input` prop: `type="email"`, `type="password"`, `autoComplete`, `placeholder`…

  ```tsx
  <form.AppField name="email">
    {(field) => (
      <field.TextField label="Email" type="email" autoComplete="email" />
    )}
  </form.AppField>
  ```

- `field.TextareaField` — `<Textarea>` with a label. Accepts `Textarea` props like `rows`.

  ```tsx
  <form.AppField name="content">
    {(field) => <field.TextareaField label="Content" rows={8} />}
  </form.AppField>
  ```

- `field.CheckboxField` — `<Checkbox>` with an inline label, for boolean values (default the field to `false`).

  ```tsx
  <form.AppField name="published">
    {(field) => <field.CheckboxField label="Published" />}
  </form.AppField>
  ```

And the submit button, which must be wrapped in `form.AppForm`:

- `form.SubmitButton` — renders a `Button type="submit"` that disables itself and shows "Working…" while `onSubmit` is running.

  ```tsx
  <form.AppForm>
    <form.SubmitButton>Save</form.SubmitButton>
  </form.AppForm>
  ```

## 3. One schema, shared with the server function

Define the schema next to the server functions and import it into the route. The form uses it in `validators.onSubmit`; the server function uses it in `.validator()` — invalid data is rejected on the server even if someone bypasses the form.

```tsx
// src/functions/posts.ts
export const postInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Enter a title')
    .max(200, 'Keep it under 200 characters'),
  content: z.string(),
})

export const createPost = createServerFn({ method: 'POST' })
  .validator(postInputSchema)
  .handler(async ({ data }) => {
    /* data is typed + validated */
  })
```

Zod v4 notes, both verified against this kit:

- `z.email('Enter a valid email address')` is a top-level function (not `z.string().email()`) — see `src/lib/auth-schemas.ts`.
- Do NOT use `.optional().default('')` on a field the form manages. A defaulted field makes the schema's INPUT type `string | undefined`, and TanStack Form rejects the schema because `defaultValues` supply a plain `string`. Give the field a plain type (`z.string()`) and provide the default via `defaultValues` (and a DB column default for non-form callers).

## 4. Error display

Comes for free from the field components: after a field is touched, its first validation error renders under the input as `<p role="alert" class="text-sm text-destructive">…</p>`, and the input gets `aria-invalid`. The messages are the ones in the Zod schema (`'Enter a title'`, …). Validation runs on submit (`validators.onSubmit`), so users aren't nagged while typing; submit is blocked until the schema passes, and `onSubmit` only runs with valid data.

## 5. Toasts on success and failure

Use `import { toast } from 'sonner'` (the `<Toaster />` is already mounted in `src/routes/__root.tsx`):

- Success: `toast.success('Post created')`, then `await router.invalidate()` (refresh loader data / session) and navigate if the flow moves elsewhere.
- Failure: wrap the server call in `try/catch` and `toast.error('Could not create the post')`. For APIs that return errors instead of throwing (better-auth does), branch on the result — from `src/routes/login.tsx`:

  ```tsx
  onSubmit: async ({ value }) => {
    const { error } = await authClient.signIn.email(value)
    if (error) {
      toast.error(error.message ?? 'Sign in failed')
      return
    }
    await router.invalidate()
    await router.navigate({ to: search.redirect ?? '/' })
  },
  ```

## Verify

1. `npx tsc --noEmit` — a mismatch between `defaultValues` and the schema (including the `.optional().default()` trap above) fails here.
2. In the browser: submit the form empty → the first error appears under the offending field (e.g. "Enter a title") and no request is sent. Fill it correctly → the submit button flips to "Working…", a success toast appears, and the mutation lands.
3. If submitting causes a full-page navigation with the field values in the URL query string, React hydration has crashed and the browser fell back to a native form submit — check the console for module-init errors (see crud.md step 1 for the known `pg`/`Buffer is not defined` cause).
