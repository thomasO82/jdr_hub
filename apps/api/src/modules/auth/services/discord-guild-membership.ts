import type { AuthConfig } from '../config.js'
import type { DiscordGuildMembershipClient } from '../discord-guild-client.js'
import type { AuthRepository } from '../repository.js'
import { createLoginAttempt, hashOAuthState } from './oauth.js'

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize'
const MEMBERSHIP_RETURN_TO = '/profil?discord=connected'

function buildGuildAuthorizationUrl(config: AuthConfig, attempt: ReturnType<typeof createLoginAttempt>): string {
  const url = new URL(DISCORD_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('scope', 'guilds.join')
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('state', attempt.state)
  url.searchParams.set('code_challenge', hashOAuthState(attempt.record.codeVerifier))
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

/** Starts a purpose-specific OAuth attempt bound to the current account and server session. */
export async function startDiscordGuildMembership(input: {
  config: AuthConfig
  now: Date
  randomBytes?: () => Uint8Array
  repository: AuthRepository
  sessionId: string
  userId: string
}): Promise<string> {
  if (!input.config.discordGuildId || !input.config.discordBotToken) throw new Error('DISCORD_GUILD_NOT_CONFIGURED')
  const attempt = createLoginAttempt({
    now: input.now,
    returnTo: MEMBERSHIP_RETURN_TO,
    ...(input.randomBytes ? { randomBytes: input.randomBytes } : {}),
  })
  await input.repository.createGuildJoinAttempt({ userId: input.userId, sessionId: input.sessionId, attempt: attempt.record })
  return buildGuildAuthorizationUrl(input.config, attempt)
}

/** Completes one matching, unexpired state and persists membership only after Discord confirms the add. */
export async function completeDiscordGuildJoin(input: {
  code: string
  state: string
  sessionId: string
  sessionUserId: string
  config: AuthConfig
  repository: AuthRepository
  client: DiscordGuildMembershipClient
  now: () => Date
}): Promise<string | null> {
  const consumed = await input.repository.consumeGuildJoinAttempt(hashOAuthState(input.state), input.now(), { sessionId: input.sessionId, userId: input.sessionUserId })
  if (!consumed) return null
  if (consumed.attempt.expiresAt.getTime() <= input.now().getTime()) return null
  const discordUserId = await input.repository.findDiscordIdForUser(consumed.userId)
  if (!discordUserId) return null

  await input.client.addCurrentUser({
    code: input.code,
    codeVerifier: consumed.attempt.codeVerifier,
    discordUserId,
    config: input.config,
  })
  await input.repository.markDiscordGuildJoined(consumed.userId, input.now())
  return MEMBERSHIP_RETURN_TO
}

/** Consumes a denied consent callback without changing the JDR Hub session or membership state. */
export async function cancelDiscordGuildJoin(input: {
  state: string
  sessionId: string
  sessionUserId: string
  outcome: 'declined' | 'unavailable'
  repository: AuthRepository
  now: () => Date
}): Promise<string | null> {
  const consumed = await input.repository.consumeGuildJoinAttempt(hashOAuthState(input.state), input.now(), { sessionId: input.sessionId, userId: input.sessionUserId })
  if (!consumed) return null
  return input.outcome === 'declined' ? '/profil?discord=declined' : '/profil?discord=unavailable'
}
