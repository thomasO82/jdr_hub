import type { AuthRepository } from '../repository.js'
import { getSessionTokenDigest } from './session-service.js'

export async function logoutSession(input: {
  now: Date
  repository: AuthRepository
  refreshToken: string | undefined
}): Promise<void> {
  if (input.refreshToken) {
    await input.repository.logoutSession(getSessionTokenDigest(input.refreshToken), input.now)
  }
}
