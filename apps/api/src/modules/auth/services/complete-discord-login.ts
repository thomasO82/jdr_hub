import type { AuthConfig } from '../config.js'
import type { DiscordIdentity } from '../discord-client.js'
import { hashOAuthState } from './oauth.js'
import type { AuthRepository } from '../repository.js'
import { createAccessToken } from './access-token.js'
import { createSessionCredential } from './session-service.js'

export type CompletedDiscordLogin = {
  accessToken: string
  redirectTo: string
  refreshExpiresAt: Date
  refreshToken: string
}

export async function completeDiscordLogin(input: {
  code: string
  config: AuthConfig
  fetchDiscordIdentity: (input: { code: string; codeVerifier: string; config: AuthConfig }) => Promise<DiscordIdentity>
  now: () => Date
  repository: AuthRepository
  state: string
}): Promise<CompletedDiscordLogin | null> {
  const attempt = await input.repository.consumeLoginAttempt(
    hashOAuthState(input.state),
    input.now(),
  )

  if (!attempt || attempt.expiresAt.getTime() <= input.now().getTime()) {
    return null
  }
  const identity = await input.fetchDiscordIdentity({ code: input.code, codeVerifier: attempt.codeVerifier, config: input.config })
  const user = await input.repository.upsertDiscordUser(identity, input.now())
  const now = input.now()
  const credential = createSessionCredential({ now })
  await input.repository.createSession(user.id, credential)
  return {
    accessToken: await createAccessToken({ config: input.config, now, sessionId: credential.id, userId: user.id }),
    redirectTo: attempt.returnTo,
    refreshExpiresAt: credential.absoluteExpiresAt,
    refreshToken: credential.token,
  }
}
