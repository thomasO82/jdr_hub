import { describe, expect, it, vi } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createDiscordGuildMembershipClient } from '../../../src/modules/auth/discord-guild-client.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  DISCORD_GUILD_ID: '234567890123456789',
  DISCORD_BOT_TOKEN: 'test-only-bot-token',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})

describe('Discord guild membership client', () => {
  it.each([201, 204])('adds the OAuth identity to the configured guild when Discord returns %i', async (status) => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'short-lived-user-token', token_type: 'Bearer' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status }))
    const client = createDiscordGuildMembershipClient({ fetcher })

    await expect(client.addCurrentUser({ code: 'oauth-code', codeVerifier: 'pkce-verifier', discordUserId: '345678901234567890', config })).resolves.toBeUndefined()

    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://discord.com/api/oauth2/token', expect.objectContaining({ method: 'POST' }))
    const tokenRequest = fetcher.mock.calls[0]?.[1] as RequestInit
    expect(new URLSearchParams(String(tokenRequest.body)).get('code')).toBe('oauth-code')
    expect(new URLSearchParams(String(tokenRequest.body)).get('code_verifier')).toBe('pkce-verifier')
    expect(tokenRequest.headers).toMatchObject({ Authorization: `Basic ${Buffer.from('123456789012345678:test-only-client-secret').toString('base64')}` })

    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://discord.com/api/v10/guilds/234567890123456789/members/345678901234567890', expect.objectContaining({ method: 'PUT' }))
    const memberRequest = fetcher.mock.calls[1]?.[1] as RequestInit
    expect(memberRequest.headers).toMatchObject({ Authorization: 'Bot test-only-bot-token', 'Content-Type': 'application/json' })
    expect(memberRequest.body).toBe(JSON.stringify({ access_token: 'short-lived-user-token' }))
  })

  it('rejects provider failures without exposing the response body or OAuth token', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'short-lived-user-token', token_type: 'Bearer' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('private provider details', { status: 403 }))
    const client = createDiscordGuildMembershipClient({ fetcher })

    const result = await client.addCurrentUser({ code: 'oauth-code', codeVerifier: 'pkce-verifier', discordUserId: '345678901234567890', config }).then(() => null, (error: unknown) => error)
    expect(result).toMatchObject({ message: 'DISCORD_GUILD_JOIN_FAILED' })
    expect(String(result)).not.toContain('private provider details')
    expect(String(result)).not.toContain('short-lived-user-token')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects malformed token responses without calling the guild endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: '', token_type: 'Bearer' }), { status: 200 }))
    const client = createDiscordGuildMembershipClient({ fetcher })

    await expect(client.addCurrentUser({ code: 'oauth-code', codeVerifier: 'pkce-verifier', discordUserId: '345678901234567890', config })).rejects.toThrow('DISCORD_OAUTH_FAILED')
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
