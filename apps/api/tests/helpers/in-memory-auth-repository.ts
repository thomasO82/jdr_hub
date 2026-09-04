import { randomUUID } from 'node:crypto'
import type { DiscordIdentity } from '../../src/modules/auth/discord-client.js'
import type { OAuthLoginAttempt } from '../../src/modules/auth/services/oauth.js'
import type {
  AuthRepository,
  AuthenticatedUser,
  StoredSession,
} from '../../src/modules/auth/repository.js'
import { getNextIdleExpiry, type NewSessionCredential } from '../../src/modules/auth/services/session-service.js'

/** Deterministic repository for tests; production code uses PostgreSQL only. */
export function createInMemoryAuthRepository(): AuthRepository & { debugStoredValues(): string } {
  const attempts = new Map<string, OAuthLoginAttempt>()
  const usersByDiscordId = new Map<string, AuthenticatedUser>()
  const sessions = new Map<string, StoredSession>()

  return {
    async createLoginAttempt(attempt) {
      if (attempts.has(attempt.stateDigest)) throw new Error('OAUTH_ATTEMPT_ALREADY_EXISTS')
      attempts.set(attempt.stateDigest, { ...attempt })
    },
    async consumeLoginAttempt(stateDigest, now) {
      const stored = attempts.get(stateDigest)
      if (!stored || stored.consumedAt || stored.expiresAt.getTime() <= now.getTime()) return null
      attempts.set(stateDigest, { ...stored, consumedAt: now })
      return stored
    },
    async upsertDiscordUser(identity: DiscordIdentity) {
      const existing = usersByDiscordId.get(identity.discordId)
      const user: AuthenticatedUser = {
        id: existing?.id ?? randomUUID(), username: identity.username,
        avatarUrl: identity.avatarUrl, timezone: existing?.timezone ?? 'Europe/Paris',
      }
      usersByDiscordId.set(identity.discordId, user)
      return user
    },
    async createSession(userId: string, credential: NewSessionCredential) {
      sessions.set(credential.tokenDigest, {
        id: credential.id,
        userId,
        tokenDigest: credential.tokenDigest,
        idleExpiresAt: credential.idleExpiresAt,
        absoluteExpiresAt: credential.absoluteExpiresAt,
        revokedAt: credential.revokedAt,
      })
    },
    async findSession(tokenDigest) { return sessions.get(tokenDigest) ?? null },
    async findSessionById(id) { return [...sessions.values()].find((session) => session.id === id) ?? null },
    async findUser(userId) { return [...usersByDiscordId.values()].find((user) => user.id === userId) ?? null },
    async logoutSession(tokenDigest, now) {
      const session = sessions.get(tokenDigest)
      if (!session) return
      if (!session.revokedAt) { sessions.set(tokenDigest, { ...session, revokedAt: now }); return }
      for (const [digest, candidate] of sessions.entries()) {
        if (candidate.userId === session.userId && !candidate.revokedAt) sessions.set(digest, { ...candidate, revokedAt: now })
      }
    },
    async revokeUserSessions(userId, now) {
      for (const [digest, session] of sessions.entries()) {
        if (session.userId === userId && !session.revokedAt) sessions.set(digest, { ...session, revokedAt: now })
      }
    },
    async rotateSession(currentTokenDigest, replacement, now) {
      const current = sessions.get(currentTokenDigest)
      if (!current || current.revokedAt || current.idleExpiresAt.getTime() <= now.getTime() || current.absoluteExpiresAt.getTime() <= now.getTime()) return null
      sessions.set(currentTokenDigest, { ...current, revokedAt: now })
      const rotated: StoredSession = { absoluteExpiresAt: current.absoluteExpiresAt, id: replacement.id,
        idleExpiresAt: getNextIdleExpiry(now, current.absoluteExpiresAt), revokedAt: null,
        tokenDigest: replacement.tokenDigest, userId: current.userId }
      sessions.set(rotated.tokenDigest, rotated)
      return rotated
    },
    async touchSession(tokenDigest, now) {
      const session = sessions.get(tokenDigest)
      if (!session || session.revokedAt || session.absoluteExpiresAt.getTime() <= now.getTime()) return
      sessions.set(tokenDigest, { ...session, idleExpiresAt: getNextIdleExpiry(now, session.absoluteExpiresAt) })
    },
    debugStoredValues() { return JSON.stringify({ attempts: [...attempts.values()], sessions: [...sessions.values()] }) },
  }
}
