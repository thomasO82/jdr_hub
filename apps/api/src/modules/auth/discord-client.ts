import { z } from 'zod'
import type { AuthConfig } from './config.js'

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_CURRENT_USER_URL = 'https://discord.com/api/v10/users/@me'

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
})

const discordUserSchema = z.object({
  id: z.string().regex(/^\d{17,20}$/),
  username: z.string().trim().min(1).max(64),
  avatar: z.string().nullable(),
})

export type DiscordIdentity = {
  avatarUrl: string | null
  discordId: string
  username: string
}

type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Exchanges an OAuth code and reduces Discord's response to the needed identity. */
export async function fetchDiscordIdentity({
  code,
  codeVerifier,
  config,
  fetch = globalThis.fetch,
}: {
  code: string
  codeVerifier: string
  config: AuthConfig
  fetch?: FetchFunction
}): Promise<DiscordIdentity> {
  const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
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

  if (!tokenResponse.ok) {
    throw new Error('DISCORD_OAUTH_FAILED')
  }

  const token = tokenResponseSchema.safeParse(await tokenResponse.json())
  if (!token.success) {
    throw new Error('DISCORD_OAUTH_FAILED')
  }

  const identityResponse = await fetch(DISCORD_CURRENT_USER_URL, {
    headers: { Authorization: `Bearer ${token.data.access_token}` },
  })

  if (!identityResponse.ok) {
    throw new Error('DISCORD_OAUTH_FAILED')
  }

  const user = discordUserSchema.safeParse(await identityResponse.json())
  if (!user.success) {
    throw new Error('DISCORD_OAUTH_FAILED')
  }

  return {
    discordId: user.data.id,
    username: user.data.username,
    avatarUrl: user.data.avatar
      ? `https://cdn.discordapp.com/avatars/${user.data.id}/${user.data.avatar}.png?size=128`
      : null,
  }
}
