import { describe, expect, it } from 'vitest'
import { createLoginAttempt } from '../../../src/modules/auth/services/oauth.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'

const now = new Date('2026-09-03T12:00:00.000Z')

describe('authentication repository', () => {
  it('consumes a valid login attempt only once', async () => {
    const repository = createInMemoryAuthRepository()
    const attempt = createLoginAttempt({
      now,
      returnTo: '/',
      randomBytes: () => new Uint8Array(32).fill(4),
    })
    await repository.createLoginAttempt(attempt.record)

    expect(await repository.consumeLoginAttempt(attempt.record.stateDigest, now)).toEqual(
      attempt.record,
    )
    expect(await repository.consumeLoginAttempt(attempt.record.stateDigest, now)).toBeNull()
  })

  it('upserts a Discord user idempotently and keeps session tokens out of storage', async () => {
    const repository = createInMemoryAuthRepository()
    const credential = createSessionCredential({
      now,
      randomBytes: () => new Uint8Array(32).fill(5),
    })
    const firstUser = await repository.upsertDiscordUser(
      { discordId: '123456789012345678', username: 'AncienPseudo', avatarUrl: null },
      now,
    )
    const updatedUser = await repository.upsertDiscordUser(
      { discordId: '123456789012345678', username: 'NouveauPseudo', avatarUrl: null },
      now,
    )
    await repository.createSession(firstUser.id, credential)

    expect(updatedUser).toMatchObject({ id: firstUser.id, username: 'NouveauPseudo' })
    expect(await repository.findSession(credential.tokenDigest)).toMatchObject({
      userId: firstUser.id,
      tokenDigest: credential.tokenDigest,
    })
    expect(repository.debugStoredValues()).not.toContain(credential.token)
  })

  it('slides the idle expiry without extending the absolute session lifetime', async () => {
    const repository = createInMemoryAuthRepository()
    const credential = createSessionCredential({
      now,
      randomBytes: () => new Uint8Array(32).fill(7),
    })
    const user = await repository.upsertDiscordUser(
      { discordId: '123456789012345678', username: 'Aventurier', avatarUrl: null },
      now,
    )
    await repository.createSession(user.id, credential)

    await repository.touchSession(credential.tokenDigest, new Date('2026-09-09T12:00:00.000Z'))

    expect(await repository.findSession(credential.tokenDigest)).toMatchObject({
      idleExpiresAt: new Date('2026-09-16T12:00:00.000Z'),
      absoluteExpiresAt: credential.absoluteExpiresAt,
    })
  })
})
