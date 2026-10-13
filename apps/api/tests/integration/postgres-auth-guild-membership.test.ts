import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { authSchema, createDatabase, migrateDatabase } from '@jdr-hub/database'
import { createPostgresAuthRepository } from '../../src/modules/auth/repository.js'
import { createSessionCredential } from '../../src/modules/auth/services/session-service.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const now = new Date('2026-10-13T12:00:00.000Z')

describe('PostgreSQL Discord guild membership repository', () => {
  it('atomically consumes session-bound attempts and stores membership timestamps only', async () => {
    await migrateDatabase(database)
    const userId = randomUUID()
    const discordId = `guild-${randomUUID().slice(0, 8)}`
    await database.db.insert(authSchema.users).values({ id: userId, discordId, username: 'Test membership' })
    const credential = createSessionCredential({ now })
    const sessionId = credential.id
    await database.db.insert(authSchema.sessions).values({ id: sessionId, userId, ...credential })
    const repository = createPostgresAuthRepository(database.db)
    const attempt = {
      stateDigest: Buffer.alloc(32, 12).toString('base64url'),
      codeVerifier: Buffer.alloc(32, 13).toString('base64url'),
      returnTo: '/profil?discord=connected',
      expiresAt: new Date(now.getTime() + 60_000),
      consumedAt: null,
    }

    try {
      await repository.createGuildJoinAttempt({ userId, sessionId, attempt })
      const consumed = await Promise.all([
        repository.consumeGuildJoinAttempt(attempt.stateDigest, now),
        repository.consumeGuildJoinAttempt(attempt.stateDigest, now),
      ])
      expect(consumed.filter(Boolean)).toHaveLength(1)
      expect(await repository.findDiscordIdForUser(userId)).toBe(discordId)

      await repository.markDiscordGuildJoined(userId, now)
      expect(await repository.getDiscordGuildMembership(userId)).toEqual({ joinedAt: now, promptDismissedAt: null })
      const storedAttempts = await database.db.select().from(authSchema.discordGuildJoinAttempts).where(eq(authSchema.discordGuildJoinAttempts.userId, userId))
      expect(Object.keys(storedAttempts[0] ?? {})).not.toContain('accessToken')
      expect(Object.keys(storedAttempts[0] ?? {})).not.toContain('refreshToken')
    } finally {
      await database.db.delete(authSchema.users).where(eq(authSchema.users.id, userId))
    }
  })

  it('refuses an expired attempt without consuming it as a valid authorization', async () => {
    await migrateDatabase(database)
    const userId = randomUUID()
    await database.db.insert(authSchema.users).values({ id: userId, discordId: `guild-${randomUUID().slice(0, 8)}`, username: 'Expired membership' })
    const credential = createSessionCredential({ now })
    const sessionId = credential.id
    await database.db.insert(authSchema.sessions).values({ id: sessionId, userId, ...credential })
    const repository = createPostgresAuthRepository(database.db)
    const attempt = {
      stateDigest: Buffer.alloc(32, 14).toString('base64url'),
      codeVerifier: Buffer.alloc(32, 15).toString('base64url'),
      returnTo: '/profil?discord=connected',
      expiresAt: new Date(now.getTime() - 1),
      consumedAt: null,
    }

    try {
      await repository.createGuildJoinAttempt({ userId, sessionId, attempt })
      expect(await repository.consumeGuildJoinAttempt(attempt.stateDigest, now)).toBeNull()
      expect(await repository.getDiscordGuildMembership(userId)).toEqual({ joinedAt: null, promptDismissedAt: null })
    } finally {
      await database.db.delete(authSchema.users).where(eq(authSchema.users.id, userId))
    }
  })
})

afterAll(async () => {
  await database.client.end()
})
