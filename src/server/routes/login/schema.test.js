import { describe, it, expect } from 'vitest'
import { loginPayloadSchema } from './schema.js'

describe('loginPayloadSchema', () => {
  it('passes with a valid username and password', () => {
    const { error, value } = loginPayloadSchema.validate({
      username: 'alice',
      password: 'secret'
    })

    expect(error).toBeUndefined()
    expect(value.username).toBe('alice')
    expect(value.password).toBe('secret')
  })

  it('passes with a valid username, password, and redirectTo', () => {
    const { error, value } = loginPayloadSchema.validate({
      username: 'alice',
      password: 'secret',
      redirectTo: '/movements/123'
    })

    expect(error).toBeUndefined()
    expect(value.redirectTo).toBe('/movements/123')
  })

  it('trims whitespace from username', () => {
    const { error, value } = loginPayloadSchema.validate({
      username: '  alice  ',
      password: 'secret'
    })

    expect(error).toBeUndefined()
    expect(value.username).toBe('alice')
  })

  it('does not trim whitespace from password', () => {
    const { error, value } = loginPayloadSchema.validate({
      username: 'alice',
      password: '  secret  '
    })

    expect(error).toBeUndefined()
    expect(value.password).toBe('  secret  ')
  })

  describe('username', () => {
    it('fails when missing', () => {
      const { error } = loginPayloadSchema.validate({
        password: 'secret'
      })

      expect(error.details[0].message).toBe('Enter a username')
      expect(error.details[0].path).toEqual(['username'])
    })

    it('fails when empty', () => {
      const { error } = loginPayloadSchema.validate({
        username: '',
        password: 'secret'
      })

      expect(error.details[0].message).toBe('Enter a username')
    })

    it('fails when only whitespace (trimmed to empty)', () => {
      const { error } = loginPayloadSchema.validate({
        username: '   ',
        password: 'secret'
      })

      expect(error.details[0].message).toBe('Enter a username')
    })
  })

  describe('password', () => {
    it('fails when missing', () => {
      const { error } = loginPayloadSchema.validate({
        username: 'alice'
      })

      expect(error.details[0].message).toBe('Enter a password')
      expect(error.details[0].path).toEqual(['password'])
    })

    it('fails when empty', () => {
      const { error } = loginPayloadSchema.validate({
        username: 'alice',
        password: ''
      })

      expect(error.details[0].message).toBe('Enter a password')
    })
  })

  describe('redirectTo', () => {
    it('is optional', () => {
      const { error } = loginPayloadSchema.validate({
        username: 'alice',
        password: 'secret'
      })

      expect(error).toBeUndefined()
    })

    it('allows an empty string', () => {
      const { error, value } = loginPayloadSchema.validate({
        username: 'alice',
        password: 'secret',
        redirectTo: ''
      })

      expect(error).toBeUndefined()
      expect(value.redirectTo).toBe('')
    })
  })

  it('reports all failing fields at once when both are missing', () => {
    const { error } = loginPayloadSchema.validate({}, { abortEarly: false })

    const messages = error.details.map((detail) => detail.message)
    expect(messages).toContain('Enter a username')
    expect(messages).toContain('Enter a password')
  })
})
