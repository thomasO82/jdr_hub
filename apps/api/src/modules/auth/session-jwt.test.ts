import { describe, expect, it } from 'vitest'
import { createSessionCredential } from './session-service.js'

describe('refresh session credentials', () => {
  it('creates a non-secret UUID session identifier for access-token binding', () => {
    const credential = createSessionCredential({
      now: new Date('2026-09-04T12:00:00.000Z'),
      randomBytes: () => new Uint8Array(32).fill(9),
    })

    expect(credential.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
})
