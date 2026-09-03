import { randomUUID } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { authSchema, type createDatabase } from '@jdr-hub/database'
import type { DiscordIdentity } from './discord-client.js'
import type { OAuthLoginAttempt } from './oauth.js'
import type {
  NewSessionCredential,
  StoredSessionCredential,
} from './session-service.js'

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
  findUser(userId: string): Promise<AuthenticatedUser | null>
  revokeSession(tokenDigest: string, now: Date): Promise<void>
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
    async findUser(userId) {
      const [user] = await database
        .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl, timezone: users.timezone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      return user ?? null
    },
    async revokeSession(tokenDigest, now) {
      await database.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.tokenDigest, tokenDigest), isNull(sessions.revokedAt)))
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
    async findUser(userId) {
      return [...usersByDiscordId.values()].find((user) => user.id === userId) ?? null
    },
    async revokeSession(tokenDigest, now) {
      const session = sessions.get(tokenDigest)
      if (session && !session.revokedAt) {
        sessions.set(tokenDigest, { ...session, revokedAt: now })
      }
    },
    debugStoredValues() {
      return JSON.stringify({ attempts: [...attempts.values()], sessions: [...sessions.values()] })
    },
  }
}
