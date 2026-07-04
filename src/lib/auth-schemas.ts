import { z } from 'zod'

// Validation for the auth forms, shared by the login/signup pages. The same
// pattern applies to any form: define one Zod schema, use it in the form's
// `validators.onSubmit` AND in the server function's `.validator()` so the
// client and server always agree.

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signupSchema = loginSchema.extend({
  name: z.string().min(1, 'Enter your name'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
