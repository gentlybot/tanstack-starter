// Canonical unit test for a Zod schema (or any pure function): runs in the
// default `node` environment, no DOM needed. Use safeParse and assert on
// `success` plus the custom error message.
import { describe, expect, it } from 'vitest'

import { loginSchema, signupSchema } from './auth-schemas'

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    const result = loginSchema.safeParse({
      email: 'ada@example.com',
      password: 'correct-horse',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a bad email with the custom message', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'correct-horse',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address')
  })

  it('rejects a short password', () => {
    const result = loginSchema.safeParse({
      email: 'ada@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'Password must be at least 8 characters',
    )
  })
})

describe('signupSchema', () => {
  it('requires a non-empty name', () => {
    const result = signupSchema.safeParse({
      email: 'ada@example.com',
      password: 'correct-horse',
      name: '',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter your name')
  })
})
