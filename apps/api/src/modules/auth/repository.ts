import { randomUUID } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { authSchema, type createDatabase } from '@jdr-hub/database'
import type { DiscordIdentity } from './discord-client.js'
import type { OAuthLoginAttempt } from './oauth.js'
import type {
  NewSessionCredential,
  StoredSessionCredential,
} from './session-service.js'
import { getNextIdleExpiry } from './session-service.js'

export type AuthenticatedUser = {
  avatarUrl: string | null
  id: string
  timezone: string
  username: string
}

export type StoredSession = StoredSessionCredential & {
  userId: string
}

export interface AuthRepository {
  consumeLoginAttempt(stateDigest: string, now: Date): Promise<OAuthLoginAttempt | null>
  createLoginAttempt(attempt: OAuthLoginAttempt): Promise<void>
  createSession(userId: string, credential: NewSessionCredential): Promise<void>
  findSession(tokenDigest: string): Promise<StoredSession | null>
  findSessionById(id: string): Promise<StoredSession | null>
  findUser(userId: string): Promise<AuthenticatedUser | null>
  logoutSession(tokenDigest: string, now: Date): Promise<void>
  revokeUserSessions(userId: string, now: Date): Promise<void>
  rotateSession(currentTokenDigest: string, replacement: NewSessionCredential, now: Date): Promise<StoredSession | null>
  touchSession(tokenDigest: string, now: Date): Promise<void>
  upsertDiscordUser(identity: DiscordIdentity, now: Date): Promise<AuthenticatedUser>
}

type AuthDatabase = ReturnType<typeof createDatabase>['db']

/** Creates the PostgreSQL repository used by the production API. */
export function createPostgresAuthRepository(database: AuthDatabase): AuthRepository {
  const { oauthLoginAttempts, sessions, users } = authSchema
  return {
    async createLoginAttempt(attempt) {
      await database.insert(oauthLoginAttempts).values(attempt)
    },
    async consumeLoginAttempt(stateDigest, now) {
      const [attempt] = await database
        .update(oauthLoginAttempts)
        .set({ consumedAt: now })
        .where(
          and(
            eq(oauthLoginAttempts.stateDigest, stateDigest),
            isNull(oauthLoginAttempts.consumedAt),
            gt(oauthLoginAttempts.expiresAt, now),
          ),
        )
        .returning()
      return attempt ?? null
    },
    async upsertDiscordUser(identity, now) {
      const [user] = await database
        .insert(users)
        .values({
          discordId: identity.discordId,
          username: identity.username,
          avatarUrl: identity.avatarUrl,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: users.discordId,
          set: { username: identity.username, avatarUrl: identity.avatarUrl, updatedAt: now },
        })
        .returning({ id: users.id, username: users.username, avatarUrl: users.avatarUrl, timezone: users.timezone })
      if (!user) throw new Error('AUTH_USER_UPSERT_FAILED')
      return user
    },
    async createSession(userId, credential) {
      await database.insert(sessions).values({ userId, ...credential })
    },
    async findSession(tokenDigest) {
      const [session] = await database.select().from(sessions).where(eq(sessions.tokenDigest, tokenDigest)).limit(1)
      return session ?? null
    },
    async findSessionById(id) {
      const [session] = await database.select().from(sessions).where(eq(sessions.id, id)).limit(1)
      return session ?? null
    },
    async findUser(userId) {
      const [user] = await database
        .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl, timezone: users.timezone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      return user ?? null
    },
    async logoutSession(tokenDigest, now) {
      await database.transaction(async (transaction) => {
        const [revoked] = await transaction
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.tokenDigest, tokenDigest), isNull(sessions.revokedAt)))
          .returning({ userId: sessions.userId })
        if (revoked) return

        const [stale] = await transaction
          .select({ userId: sessions.userId })
          .from(sessions)
          .where(eq(sessions.tokenDigest, tokenDigest))
          .limit(1)
        if (!stale) return

        // A revoked credential presented again may have been copied: revoke its sibling sessions too.
        await transaction
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.userId, stale.userId), isNull(sessions.revokedAt)))
      })
    },
    async revokeUserSessions(userId, now) {
      await database.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    },
    async rotateSession(currentTokenDigest, replacement, now) {
      return database.transaction(async (transaction) => {
        const [current] = await transaction
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(
            eq(sessions.tokenDigest, currentTokenDigest),
            isNull(sessions.revokedAt),
            gt(sessions.idleExpiresAt, now),
            gt(sessions.absoluteExpiresAt, now),
          ))
          .returning()

        if (!current) return null

        const [rotated] = await transaction
          .insert(sessions)
          .values({
            ...replacement,
            absoluteExpiresAt: current.absoluteExpiresAt,
            idleExpiresAt: getNextIdleExpiry(now, current.absoluteExpiresAt),
            lastSeenAt: now,
            userId: current.userId,
          })
          .returning()
        return rotated ?? null
      })
    },
    async touchSession(tokenDigest, now) {
      const [session] = await database
        .select({ absoluteExpiresAt: sessions.absoluteExpiresAt })
        .from(sessions)
        .where(and(eq(sessions.tokenDigest, tokenDigest), isNull(sessions.revokedAt), gt(sessions.absoluteExpiresAt, now)))
        .limit(1)
      if (!session) return
      await database
        .update(sessions)
        .set({ idleExpiresAt: getNextIdleExpiry(now, session.absoluteExpiresAt), lastSeenAt: now })
        .where(and(eq(sessions.tokenDigest, tokenDigest), isNull(sessions.revokedAt)))
    },
  }
}

/** Minimal deterministic repository used by unit and API tests without a real database. */
export function createInMemoryAuthRepository(): AuthRepository & {
  debugStoredValues(): string
} {
  const attempts = new Map<string, OAuthLoginAttempt>()
  const usersByDiscordId = new Map<string, AuthenticatedUser>()
  const sessions = new Map<string, StoredSession>()

  return {
    async createLoginAttempt(attempt) {
      if (attempts.has(attempt.stateDigest)) {
        throw new Error('OAUTH_ATTEMPT_ALREADY_EXISTS')
      }
      attempts.set(attempt.stateDigest, { ...attempt })
    },
    async consumeLoginAttempt(stateDigest, now) {
      const stored = attempts.get(stateDigest)
      if (!stored || stored.consumedAt || stored.expiresAt.getTime() <= now.getTime()) {
        return null
      }
      attempts.set(stateDigest, { ...stored, consumedAt: now })
      return stored
    },
    async upsertDiscordUser(identity) {
      const existing = usersByDiscordId.get(identity.discordId)
      const user: AuthenticatedUser = {
        id: existing?.id ?? randomUUID(),
        username: identity.username,
        avatarUrl: identity.avatarUrl,
        timezone: existing?.timezone ?? 'Europe/Paris',
      }
      usersByDiscordId.set(identity.discordId, user)
      return user
    },
    async createSession(userId, credential) {
      sessions.set(credential.tokenDigest, {
        id: credential.id,
        userId,
        tokenDigest: credential.tokenDigest,
        idleExpiresAt: credential.idleExpiresAt,
        absoluteExpiresAt: credential.absoluteExpiresAt,
        revokedAt: credential.revokedAt,
      })
    },
    async findSession(tokenDigest) {
      return sessions.get(tokenDigest) ?? null
    },
    async findSessionById(id) {
      return [...sessions.values()].find((session) => session.id === id) ?? null
    },
    async findUser(userId) {
      return [...usersByDiscordId.values()].find((user) => user.id === userId) ?? null
    },
    async logoutSession(tokenDigest, now) {
      const session = sessions.get(tokenDigest)
      if (!session) return
      if (!session.revokedAt) {
        sessions.set(tokenDigest, { ...session, revokedAt: now })
        return
      }

      // Keep the deterministic test repository aligned with replay protection in PostgreSQL.
      for (const [digest, candidate] of sessions.entries()) {
        if (candidate.userId === session.userId && !candidate.revokedAt) {
          sessions.set(digest, { ...candidate, revokedAt: now })
        }
      }
    },
    async revokeUserSessions(userId, now) {
      for (const [tokenDigest, session] of sessions.entries()) {
        if (session.userId === userId && !session.revokedAt) {
          sessions.set(tokenDigest, { ...session, revokedAt: now })
        }
      }
    },
    async rotateSession(currentTokenDigest, replacement, now) {
      const current = sessions.get(currentTokenDigest)
      if (
        !current ||
        current.revokedAt ||
        current.idleExpiresAt.getTime() <= now.getTime() ||
        current.absoluteExpiresAt.getTime() <= now.getTime()
      ) return null

      sessions.set(currentTokenDigest, { ...current, revokedAt: now })
      const rotated: StoredSession = {
        absoluteExpiresAt: current.absoluteExpiresAt,
        id: replacement.id,
        idleExpiresAt: getNextIdleExpiry(now, current.absoluteExpiresAt),
        revokedAt: null,
        tokenDigest: replacement.tokenDigest,
        userId: current.userId,
      }
      sessions.set(rotated.tokenDigest, rotated)
      return rotated
    },
    async touchSession(tokenDigest, now) {
      const session = sessions.get(tokenDigest)
      if (!session || session.revokedAt || session.absoluteExpiresAt.getTime() <= now.getTime()) return
      sessions.set(tokenDigest, {
        ...session,
        idleExpiresAt: getNextIdleExpiry(now, session.absoluteExpiresAt),
      })
    },
    debugStoredValues() {
      return JSON.stringify({ attempts: [...attempts.values()], sessions: [...sessions.values()] })
    },
  }
}
