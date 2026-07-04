import { createFormHook, createFormHookContexts } from '@tanstack/react-form'

import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

// The canonical form setup: TanStack Form + Zod, with pre-styled field
// components. Build every form with `useAppForm` — validation, error display,
// and the submit button's pending state come for free. Usage:
//
//   const form = useAppForm({
//     defaultValues: { title: '' },
//     validators: { onSubmit: mySchema },   // a Zod schema, shared with the
//     onSubmit: async ({ value }) => { … }, // server fn's .validator()
//   })
//
//   <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
//     <form.AppField name="title">
//       {(field) => <field.TextField label="Title" />}
//     </form.AppField>
//     <form.AppForm>
//       <form.SubmitButton>Save</form.SubmitButton>
//     </form.AppForm>
//   </form>
//
// See src/routes/login.tsx for a complete example and docs/recipes/forms.md
// for the full pattern (textareas, checkboxes, server-side validation).

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Invalid value'
}

function FieldErrors({ errors }: { errors: Array<unknown> }) {
  if (errors.length === 0) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {errorText(errors[0])}
    </p>
  )
}

function TextField({
  label,
  ...inputProps
}: { label: string } & React.ComponentProps<typeof Input>) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.isTouched ? field.state.meta.errors : []
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={errors.length > 0 || undefined}
        {...inputProps}
      />
      <FieldErrors errors={errors} />
    </div>
  )
}

function TextareaField({
  label,
  ...textareaProps
}: { label: string } & React.ComponentProps<typeof Textarea>) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.isTouched ? field.state.meta.errors : []
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={errors.length > 0 || undefined}
        {...textareaProps}
      />
      <FieldErrors errors={errors} />
    </div>
  )
}

function CheckboxField({ label }: { label: string }) {
  const field = useFieldContext<boolean>()
  const errors = field.state.meta.isTouched ? field.state.meta.errors : []
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          name={field.name}
          checked={field.state.value}
          onBlur={field.handleBlur}
          onCheckedChange={(checked) => field.handleChange(checked === true)}
        />
        <Label htmlFor={field.name}>{label}</Label>
      </div>
      <FieldErrors errors={errors} />
    </div>
  )
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Working…' : children}
        </Button>
      )}
    </form.Subscribe>
  )
}

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, TextareaField, CheckboxField },
  formComponents: { SubmitButton },
})
