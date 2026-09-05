import type { AuthConfig } from '../config.js'
import { buildDiscordAuthorizationUrl, createLoginAttempt } from './oauth.js'
import type { AuthRepository } from '../repository.js'

export async function startDiscordLogin(input: {
  config: AuthConfig
  now: Date
  repository: AuthRepository
  returnTo: string
}): Promise<string> {
  const attempt = createLoginAttempt({ returnTo: input.returnTo, now: input.now })
  await input.repository.createLoginAttempt(attempt.record)
  return buildDiscordAuthorizationUrl(input.config, attempt).toString()
}
