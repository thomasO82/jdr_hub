import { describe, expect, it } from 'vitest'
import { parseCurrentUser } from '../src/auth.js'

describe('current-user contract', () => {
  it('returns only the safe local profile fields', () => {
    expect(
      parseCurrentUser({
        id: '466f2f58-5cd9-4d9f-b3ea-1d01d7635b24',
        username: 'AventureFictive',
        avatarUrl: null,
        timezone: 'Europe/Paris',
        tokenDigest: 'must-not-leak',
      }),
    ).toEqual({
      id: '466f2f58-5cd9-4d9f-b3ea-1d01d7635b24',
      username: 'AventureFictive',
      avatarUrl: null,
      timezone: 'Europe/Paris',
    })
  })

  it('rejects an invalid timezone instead of accepting an unsafe profile', () => {
    expect(() =>
      parseCurrentUser({
        id: '466f2f58-5cd9-4d9f-b3ea-1d01d7635b24',
        username: 'AventureFictive',
        avatarUrl: null,
        timezone: '',
      }),
    ).toThrow()
  })
})
