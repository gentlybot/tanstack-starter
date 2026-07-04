import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { useAppForm } from '../components/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { signupSchema } from '../lib/auth-schemas'
import { authClient } from '../lib/auth-client'
import { seo } from '../lib/seo'
import { APP_NAME } from '../lib/app'

export const Route = createFileRoute('/signup')({
  head: () => ({ meta: seo({ title: 'Create account' }) }),
  component: SignupPage,
})

function SignupPage() {
  const router = useRouter()

  const form = useAppForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: signupSchema },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signUp.email(value)
      if (error) {
        toast.error(error.message ?? 'Sign up failed')
        return
      }
      await router.invalidate()
      await router.navigate({ to: '/' })
    },
  })

  return (
    <div className="mx-auto max-w-sm py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Get started with {APP_NAME}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              form.handleSubmit()
            }}
          >
            <form.AppField name="name">
              {(field) => <field.TextField label="Name" autoComplete="name" />}
            </form.AppField>
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
                  autoComplete="new-password"
                />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton>Create account</form.SubmitButton>
            </form.AppForm>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-foreground">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
