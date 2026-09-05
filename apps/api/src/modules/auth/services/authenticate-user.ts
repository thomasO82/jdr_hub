import type { AuthConfig } from '../config.js'
import type { AuthRepository, AuthenticatedUser } from '../repository.js'
import { verifyAccessToken } from './access-token.js'
import { isSessionActive } from './session-service.js'

export async function authenticateUser(input: {
  config: AuthConfig
  now: Date
  repository: AuthRepository
  token: string
}): Promise<AuthenticatedUser | null> {
  const accessToken = await verifyAccessToken({ config: input.config, token: input.token })
  if (!accessToken) return null
  const session = await input.repository.findSessionById(accessToken.sessionId)
  if (!session || session.userId !== accessToken.userId || !isSessionActive(session, input.now)) return null
  await input.repository.touchSession(session.tokenDigest, input.now)
  return input.repository.findUser(session.userId)
}
