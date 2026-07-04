// @vitest-environment jsdom
// Canonical component test: render a useAppForm form (src/components/form.tsx)
// with Testing Library, assert the validation error (rendered as role=alert)
// blocks submit, then fill the field with fireEvent and assert onSubmit fires.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { useAppForm } from './form'

const schema = z.object({ title: z.string().min(1, 'Title is required') })

function TitleForm({
  onSubmit,
}: {
  onSubmit: (value: { title: string }) => void
}) {
  const form = useAppForm({
    defaultValues: { title: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => onSubmit(value),
  })
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.AppField name="title">
        {(field) => <field.TextField label="Title" />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  )
}

describe('useAppForm', () => {
  it('shows the validation error and does not submit when empty', async () => {
    const onSubmit = vi.fn()
    render(<TitleForm onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    // form.handleSubmit() is async — wait for the error to appear.
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Title is required')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the entered value', async () => {
    const onSubmit = vi.fn()
    render(<TitleForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Ship it' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ title: 'Ship it' }),
    )
  })
})
