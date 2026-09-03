import { randomUUID } from 'node:crypto'
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
  revokeSession(tokenDigest: string, now: Date): Promise<void>
  upsertDiscordUser(identity: DiscordIdentity, now: Date): Promise<AuthenticatedUser>
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
