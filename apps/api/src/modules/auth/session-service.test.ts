import { describe, expect, it } from 'vitest'
import {
  createSessionCredential,
  validateSessionCredential,
} from './session-service.js'

const now = new Date('2026-09-03T12:00:00.000Z')

describe('opaque application sessions', () => {
  it('returns a browser credential but persists only its digest and bounded expiries', () => {
    const credential = createSessionCredential({
      now,
      randomBytes: () => new Uint8Array(32).fill(9),
    })

    expect(credential.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(credential.tokenDigest).not.toBe(credential.token)
    expect(credential.idleExpiresAt).toEqual(
      new Date('2026-09-10T12:00:00.000Z'),
    )
    expect(credential.absoluteExpiresAt).toEqual(
      new Date('2026-10-03T12:00:00.000Z'),
    )
  })

  it('rejects an expired, revoked, or mismatched session credential', () => {
    const credential = createSessionCredential({
      now,
      randomBytes: () => new Uint8Array(32).fill(9),
    })

    expect(
      validateSessionCredential(
        { ...credential, revokedAt: null },
        credential.token,
        now,
      ),
    ).toBe(true)
    expect(
      validateSessionCredential(
        { ...credential, revokedAt: now },
        credential.token,
        now,
      ),
    ).toBe(false)
    expect(
      validateSessionCredential(
        {
          ...credential,
          revokedAt: null,
          idleExpiresAt: new Date('2026-09-03T11:59:59.999Z'),
        },
        credential.token,
        now,
      ),
    ).toBe(false)
    expect(
      validateSessionCredential(
        { ...credential, revokedAt: null },
        'another-token',
        now,
      ),
    ).toBe(false)
  })
})
