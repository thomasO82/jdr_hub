import { and, eq, gt, isNull } from 'drizzle-orm'
import { authSchema, type createDatabase } from '@jdr-hub/database'
import type { DiscordIdentity } from './discord-client.js'
import type { OAuthLoginAttempt } from './services/oauth.js'
import type {
  NewSessionCredential,
  StoredSessionCredential,
} from './services/session-service.js'
import { getNextIdleExpiry } from './services/session-service.js'

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
