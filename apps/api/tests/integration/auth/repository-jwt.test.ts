import { describe, expect, it } from 'vitest'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'

const createdAt = new Date('2026-09-03T12:00:00.000Z')
const rotatedAt = new Date('2026-09-04T12:00:00.000Z')

describe('refresh-session repository operations', () => {
  it('rotates a live refresh session exactly once without extending its absolute expiry', async () => {
    const repository = createInMemoryAuthRepository()
    const user = await repository.upsertDiscordUser(
      { discordId: '123456789012345678', username: 'AventureFictive', avatarUrl: null },
      createdAt,
    )
    const current = createSessionCredential({
      now: createdAt,
      randomBytes: () => new Uint8Array(32).fill(5),
    })
    const replacement = createSessionCredential({
      now: rotatedAt,
      randomBytes: () => new Uint8Array(32).fill(6),
    })
    await repository.createSession(user.id, current)

    const rotated = await repository.rotateSession(current.tokenDigest, replacement, rotatedAt)

    expect(rotated).toMatchObject({
      id: replacement.id,
      userId: user.id,
      absoluteExpiresAt: current.absoluteExpiresAt,
      revokedAt: null,
    })
    expect(await repository.findSession(current.tokenDigest)).toMatchObject({ revokedAt: rotatedAt })
    await expect(repository.rotateSession(current.tokenDigest, replacement, rotatedAt)).resolves.toBeNull()
  })

  it('revokes every refresh session of a user for account-security workflows', async () => {
    const repository = createInMemoryAuthRepository()
    const user = await repository.upsertDiscordUser(
      { discordId: '123456789012345678', username: 'AventureFictive', avatarUrl: null },
      createdAt,
    )
    const first = createSessionCredential({ now: createdAt })
    const second = createSessionCredential({ now: createdAt })
    await repository.createSession(user.id, first)
    await repository.createSession(user.id, second)

    await repository.revokeUserSessions(user.id, rotatedAt)

    expect(await repository.findSessionById(first.id)).toMatchObject({ revokedAt: rotatedAt })
    expect(await repository.findSessionById(second.id)).toMatchObject({ revokedAt: rotatedAt })
  })
})
