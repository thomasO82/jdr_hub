import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from './config.js'
import { fetchDiscordIdentity } from './discord-client.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})

describe('Discord OAuth adapter', () => {
  it('exchanges an authorization code server-side and returns only a minimal identity', async () => {
    const responses = [
      new Response(
        JSON.stringify({ access_token: 'test-access-token', token_type: 'Bearer' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
      new Response(
        JSON.stringify({ id: '123456789012345678', username: 'AventureFictive', avatar: null }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ]

    const identity = await fetchDiscordIdentity({
      code: 'test-authorization-code',
      codeVerifier: 'test-code-verifier',
      config,
      fetch: async () => responses.shift() as Response,
    })

    expect(identity).toEqual({
      discordId: '123456789012345678',
      username: 'AventureFictive',
      avatarUrl: null,
    })
  })

  it('returns a generic failure when Discord refuses a code exchange', async () => {
    await expect(
      fetchDiscordIdentity({
        code: 'test-authorization-code',
        codeVerifier: 'test-code-verifier',
        config,
        fetch: async () => new Response('unauthorized', { status: 401 }),
      }),
    ).rejects.toThrow('DISCORD_OAUTH_FAILED')
  })
})
