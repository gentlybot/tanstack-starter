import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAppForm } from '../components/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { loginSchema } from '../lib/auth-schemas'
import { authClient } from '../lib/auth-client'
import { seo } from '../lib/seo'

// The canonical form page: TanStack Form + a Zod schema + pre-styled fields
// from src/components/form.tsx. Copy this shape for any form in the app.
export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: seo({ title: 'Sign in' }) }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const search = Route.useSearch()

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email(value)
      if (error) {
        toast.error(error.message ?? 'Sign in failed')
        return
      }
      await router.invalidate()
      await router.navigate({ to: search.redirect ?? '/' })
    },
  })

  return (
    <div className="mx-auto max-w-sm py-12">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back — enter your details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              form.handleSubmit()
            }}
          >
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="Email"
                  type="email"
                  autoComplete="email"
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton>Sign in</form.SubmitButton>
            </form.AppForm>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account yet?{' '}
            <Link to="/signup" className="font-medium text-foreground">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
