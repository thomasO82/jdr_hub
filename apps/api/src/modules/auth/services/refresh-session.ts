import type { AuthConfig } from '../config.js'
import type { AuthRepository } from '../repository.js'
import { createAccessToken } from './access-token.js'
import { createSessionCredential, getSessionTokenDigest, validateSessionCredential } from './session-service.js'

export type RefreshedAuthentication = {
  accessToken: string
  refreshExpiresAt: Date
  refreshToken: string
}

export async function refreshSession(input: {
  config: AuthConfig
  now: Date
  repository: AuthRepository
  refreshToken: string
}): Promise<RefreshedAuthentication | null> {
  const session = await input.repository.findSession(getSessionTokenDigest(input.refreshToken))
  if (!session || !validateSessionCredential(session, input.refreshToken, input.now)) return null
  const replacement = createSessionCredential({ now: input.now })
  const rotated = await input.repository.rotateSession(session.tokenDigest, replacement, input.now)
  if (!rotated) return null
  return {
    accessToken: await createAccessToken({ config: input.config, now: input.now, sessionId: rotated.id, userId: rotated.userId }),
    refreshExpiresAt: rotated.absoluteExpiresAt,
    refreshToken: replacement.token,
  }
}
