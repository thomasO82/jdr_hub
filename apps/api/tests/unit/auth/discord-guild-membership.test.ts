import { describe, expect, it, vi } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import type { DiscordGuildMembershipClient } from '../../../src/modules/auth/discord-guild-client.js'
import { completeDiscordGuildJoin, startDiscordGuildMembership } from '../../../src/modules/auth/services/discord-guild-membership.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'

const now = new Date('2026-10-13T12:00:00.000Z')
const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  DISCORD_GUILD_ID: '234567890123456789',
  DISCORD_BOT_TOKEN: 'test-only-bot-token',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})

async function seedUser() {
  const repository = createInMemoryAuthRepository()
  const user = await repository.upsertDiscordUser({ discordId: '345678901234567890', username: 'Aventurier', avatarUrl: null }, now)
  return { repository, user }
}

describe('optional Discord guild membership', () => {
  it('starts a separate OAuth flow requesting only guilds.join', async () => {
    const { repository, user } = await seedUser()
    const url = new URL(await startDiscordGuildMembership({ config, now, repository, userId: user.id, sessionId, randomBytes: () => new Uint8Array(32).fill(8) }))

    expect(url.origin).toBe('https://discord.com')
    expect(url.pathname).toBe('/oauth2/authorize')
    expect(url.searchParams.get('scope')).toBe('guilds.join')
    expect(url.searchParams.get('scope')).not.toContain('identify')
    expect(url.searchParams.get('redirect_uri')).toBe('https://jdr-hub.example.test/api/auth/discord/callback')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('marks membership only after a valid one-use, same-user authorization succeeds', async () => {
    const { repository, user } = await seedUser()
    const url = new URL(await startDiscordGuildMembership({ config, now, repository, userId: user.id, sessionId, randomBytes: () => new Uint8Array(32).fill(9) }))
    const client: DiscordGuildMembershipClient = { addCurrentUser: vi.fn().mockResolvedValue(undefined) }
    const state = url.searchParams.get('state')!

    await expect(completeDiscordGuildJoin({ code: 'oauth-code', state, sessionId, sessionUserId: user.id, config, repository, client, now: () => now })).resolves.toBe('/profil?discord=connected')
    expect(client.addCurrentUser).toHaveBeenCalledWith({ code: 'oauth-code', codeVerifier: expect.any(String), discordUserId: '345678901234567890', config })
    expect(await repository.getDiscordGuildMembership(user.id)).toEqual({ joinedAt: now, promptDismissedAt: null })
    await expect(completeDiscordGuildJoin({ code: 'oauth-code', state, sessionId, sessionUserId: user.id, config, repository, client, now: () => now })).resolves.toBeNull()
    expect(client.addCurrentUser).toHaveBeenCalledOnce()
    expect(repository.debugStoredValues()).not.toContain('oauth-code')
  })

  it('does not let a different signed-in account claim a pending authorization', async () => {
    const { repository, user } = await seedUser()
    const url = new URL(await startDiscordGuildMembership({ config, now, repository, userId: user.id, sessionId, randomBytes: () => new Uint8Array(32).fill(10) }))
    const client: DiscordGuildMembershipClient = { addCurrentUser: vi.fn().mockResolvedValue(undefined) }

    await expect(completeDiscordGuildJoin({ code: 'oauth-code', state: url.searchParams.get('state')!, sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', sessionUserId: user.id, config, repository, client, now: () => now })).resolves.toBeNull()
    expect(client.addCurrentUser).not.toHaveBeenCalled()
    expect(await repository.getDiscordGuildMembership(user.id)).toEqual({ joinedAt: null, promptDismissedAt: null })
  })

  it('leaves membership inactive when Discord rejects the join', async () => {
    const { repository, user } = await seedUser()
    const url = new URL(await startDiscordGuildMembership({ config, now, repository, userId: user.id, sessionId, randomBytes: () => new Uint8Array(32).fill(11) }))
    const client: DiscordGuildMembershipClient = { addCurrentUser: vi.fn().mockRejectedValue(new Error('DISCORD_GUILD_JOIN_FAILED')) }

    await expect(completeDiscordGuildJoin({ code: 'oauth-code', state: url.searchParams.get('state')!, sessionId, sessionUserId: user.id, config, repository, client, now: () => now })).rejects.toThrow('DISCORD_GUILD_JOIN_FAILED')
    expect(await repository.getDiscordGuildMembership(user.id)).toEqual({ joinedAt: null, promptDismissedAt: null })
  })
})
