import { z } from 'zod'
import type { AuthConfig } from './config.js'

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_API_URL = 'https://discord.com/api/v10'

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
}).passthrough()

type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface DiscordGuildMembershipClient {
  addCurrentUser(input: { code: string; codeVerifier: string; discordUserId: string; config: AuthConfig }): Promise<void>
}

/** Exchanges one short-lived OAuth code and adds only that identity to the configured guild. */
export function createDiscordGuildMembershipClient(input: { fetcher?: FetchFunction } = {}): DiscordGuildMembershipClient {
  const fetcher = input.fetcher ?? globalThis.fetch

  return {
    async addCurrentUser({ code, codeVerifier, discordUserId, config }) {
      if (!config.discordGuildId || !config.discordBotToken) throw new Error('DISCORD_GUILD_NOT_CONFIGURED')
      if (!/^\d{17,20}$/.test(discordUserId)) throw new Error('DISCORD_GUILD_JOIN_FAILED')

      let tokenResponse: Response
      try {
        tokenResponse = await fetcher(DISCORD_TOKEN_URL, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.redirectUri,
            code_verifier: codeVerifier,
          }),
        })
      } catch {
        throw new Error('DISCORD_OAUTH_FAILED')
      }
      if (!tokenResponse.ok) throw new Error('DISCORD_OAUTH_FAILED')

      let token: z.infer<typeof tokenResponseSchema>
      try {
        token = tokenResponseSchema.parse(await tokenResponse.json())
      } catch {
        throw new Error('DISCORD_OAUTH_FAILED')
      }

      let joinResponse: Response
      try {
        joinResponse = await fetcher(`${DISCORD_API_URL}/guilds/${config.discordGuildId}/members/${discordUserId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${config.discordBotToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ access_token: token.access_token }),
        })
      } catch {
        throw new Error('DISCORD_GUILD_JOIN_FAILED')
      }

      if (joinResponse.status !== 201 && joinResponse.status !== 204) {
        throw new Error('DISCORD_GUILD_JOIN_FAILED')
      }
    },
  }
}
