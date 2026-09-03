import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { oauthLoginAttempts, sessions, users } from './schema/auth.js'

describe('authentication database schema', () => {
  it('keeps Discord identities unique and requires a timezone', () => {
    const columns = getTableColumns(users)

    expect(getTableName(users)).toBe('users')
    expect(columns.discordId.notNull).toBe(true)
    expect(columns.discordId.isUnique).toBe(true)
    expect(columns.timezone.notNull).toBe(true)
  })

  it('stores only session and OAuth state digests with expiry metadata', () => {
    const sessionColumns = getTableColumns(sessions)
    const attemptColumns = getTableColumns(oauthLoginAttempts)

    expect(sessionColumns.tokenDigest.notNull).toBe(true)
    expect(sessionColumns.tokenDigest.isUnique).toBe(true)
    expect(sessionColumns.idleExpiresAt.notNull).toBe(true)
    expect(sessionColumns.absoluteExpiresAt.notNull).toBe(true)
    expect(attemptColumns.stateDigest.notNull).toBe(true)
    expect(attemptColumns.stateDigest.isUnique).toBe(true)
    expect(attemptColumns.expiresAt.notNull).toBe(true)
    expect(attemptColumns.consumedAt.notNull).toBe(false)
  })
})
