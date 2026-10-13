import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import type { DiscordGuildMembershipClient } from '../../../src/modules/auth/discord-guild-client.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { registerAuthRoutes, type AuthRouteEnv } from '../../../src/modules/auth/routes.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  DISCORD_GUILD_ID: '234567890123456789',
  DISCORD_BOT_TOKEN: 'test-only-bot-token',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  NODE_ENV: 'production',
})

function createTestApp(input: { discordGuildMembershipClient?: DiscordGuildMembershipClient } = {}) {
  const app = new Hono<AuthRouteEnv>()
  app.use('*', async (c, next) => {
    c.set('requestId', 'test-request-id')
    await next()
  })
  const repository = createInMemoryAuthRepository()
  registerAuthRoutes(app, {
    config,
    now: () => new Date(),
    repository,
    ...(input.discordGuildMembershipClient ? { discordGuildMembershipClient: input.discordGuildMembershipClient } : {}),
    fetchDiscordIdentity: async () => ({
      discordId: '123456789012345678',
      username: 'AventureFictive',
      avatarUrl: null,
    }),
  })
  return { app, repository }
}

function cookiePair(response: Response, name: string): string {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith(`${name}=`))
  if (!cookie) throw new Error(`Cookie ${name} is missing`)
  return cookie.split(';', 1)[0]!
}

describe('authentication routes', () => {
  it('starts OAuth with a strict Discord redirect and rejects an open redirect', async () => {
    const { app } = createTestApp()
    const validResponse = await app.request('/auth/discord?returnTo=/tableau-de-bord')
    const invalidResponse = await app.request('/auth/discord?returnTo=https://attacker.example.test')

    expect(validResponse.status).toBe(302)
    expect(new URL(validResponse.headers.get('location')!).origin).toBe('https://discord.com')
    expect(invalidResponse.status).toBe(400)
  })

  it('keeps the existing landing route until the optional profile page is available', async () => {
    const { app } = createTestApp()
    const start = await app.request('/auth/discord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)

    expect(callback.headers.get('location')).toBe('/')
  })

  it('creates a local secure session only after a valid callback and returns it from /me', async () => {
    const { app } = createTestApp()
    const start = await app.request('/auth/discord?returnTo=/tableau-de-bord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
    const cookie = callback.headers.get('set-cookie')!
    const accessCookie = cookiePair(callback, 'jdr_hub_access')
    const me = await app.request('/me', { headers: { cookie: accessCookie } })

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/tableau-de-bord')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(await me.json()).toMatchObject({
      data: { username: 'AventureFictive', timezone: 'Europe/Paris' },
      error: null,
      meta: { requestId: 'test-request-id' },
    })
  })

  it('rejects a replayed callback and missing session', async () => {
    const { app } = createTestApp()
    const start = await app.request('/auth/discord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
    const replay = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)

    expect(replay.status).toBe(400)
    expect(await replay.json()).toMatchObject({ meta: { requestId: 'test-request-id' } })
    expect((await app.request('/me')).status).toBe(401)
  })

  it('requires the trusted origin to logout and revokes the current session', async () => {
    const { app } = createTestApp()
    const start = await app.request('/auth/discord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
    const accessCookie = cookiePair(callback, 'jdr_hub_access')
    const refreshCookie = cookiePair(callback, 'jdr_hub_refresh')

    expect(
      (await app.request('/auth/logout', { method: 'POST', headers: { cookie: refreshCookie, origin: 'https://attacker.example.test' } })).status,
    ).toBe(403)
    expect(
      (await app.request('/auth/logout', { method: 'POST', headers: { cookie: refreshCookie, origin: config.appOrigin } })).status,
    ).toBe(204)
    expect((await app.request('/me', { headers: { cookie: accessCookie } })).status).toBe(401)
  })

  it('starts optional server consent only for an authenticated user and asks only for guilds.join', async () => {
    const { app } = createTestApp()
    const loginStart = await app.request('/auth/discord')
    const loginState = new URL(loginStart.headers.get('location')!).searchParams.get('state')!
    const loginCallback = await app.request(`/auth/discord/callback?code=test-code&state=${loginState}`)
    const accessCookie = cookiePair(loginCallback, 'jdr_hub_access')

    expect((await app.request('/auth/discord/server')).status).toBe(401)
    const start = await app.request('/auth/discord/server', { headers: { cookie: accessCookie } })
    const authorization = new URL(start.headers.get('location')!)

    expect(start.status).toBe(302)
    expect(authorization.origin).toBe('https://discord.com')
    expect(authorization.searchParams.get('scope')).toBe('guilds.join')
    expect(authorization.searchParams.get('scope')).not.toContain('identify')
    expect(authorization.searchParams.get('redirect_uri')).toBe(config.redirectUri)
  })

  it('marks membership after Discord confirms the join and exposes only safe status from /me', async () => {
    const discordGuildMembershipClient: DiscordGuildMembershipClient = { addCurrentUser: vi.fn().mockResolvedValue(undefined) }
    const { app } = createTestApp({ discordGuildMembershipClient })
    const loginStart = await app.request('/auth/discord')
    const loginState = new URL(loginStart.headers.get('location')!).searchParams.get('state')!
    const loginCallback = await app.request(`/auth/discord/callback?code=test-code&state=${loginState}`)
    const accessCookie = cookiePair(loginCallback, 'jdr_hub_access')
    const membershipStart = await app.request('/auth/discord/server', { headers: { cookie: accessCookie } })
    const state = new URL(membershipStart.headers.get('location')!).searchParams.get('state')!

    const callback = await app.request(`/auth/discord/callback?code=membership-code&state=${state}`, { headers: { cookie: accessCookie } })
    const me = await app.request('/me', { headers: { cookie: accessCookie } })
    const mePayload = await me.json()

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/profil?discord=connected')
    expect(callback.headers.get('set-cookie')).toBeNull()
    expect(discordGuildMembershipClient.addCurrentUser).toHaveBeenCalledOnce()
    expect(mePayload).toMatchObject({ data: { discordServerJoined: true, discordServerPromptDismissed: false } })
    expect(JSON.stringify(mePayload)).not.toContain('discordId')
    expect(JSON.stringify(mePayload)).not.toContain('test-only-bot-token')
    expect(JSON.stringify(mePayload)).not.toContain('membership-code')
    expect((await app.request(`/auth/discord/callback?code=membership-code&state=${state}`, { headers: { cookie: accessCookie } })).status).toBe(400)
  })

  it('handles OAuth refusal without invalidating the JDR Hub session', async () => {
    const { app } = createTestApp()
    const loginStart = await app.request('/auth/discord')
    const loginState = new URL(loginStart.headers.get('location')!).searchParams.get('state')!
    const loginCallback = await app.request(`/auth/discord/callback?code=test-code&state=${loginState}`)
    const accessCookie = cookiePair(loginCallback, 'jdr_hub_access')
    const membershipStart = await app.request('/auth/discord/server', { headers: { cookie: accessCookie } })
    const state = new URL(membershipStart.headers.get('location')!).searchParams.get('state')!

    const declined = await app.request(`/auth/discord/callback?error=access_denied&state=${state}`, { headers: { cookie: accessCookie } })
    const me = await app.request('/me', { headers: { cookie: accessCookie } })

    expect(declined.status).toBe(302)
    expect(declined.headers.get('location')).toBe('/profil?discord=declined')
    expect(me.status).toBe(200)
    expect(await me.json()).toMatchObject({ data: { discordServerJoined: false } })
  })

  it('rejects a callback from a different session and protects dismissal with Origin', async () => {
    const discordGuildMembershipClient: DiscordGuildMembershipClient = { addCurrentUser: vi.fn().mockResolvedValue(undefined) }
    const { app } = createTestApp({ discordGuildMembershipClient })
    const firstLogin = await app.request('/auth/discord')
    const firstState = new URL(firstLogin.headers.get('location')!).searchParams.get('state')!
    const firstCallback = await app.request(`/auth/discord/callback?code=first-login&state=${firstState}`)
    const firstAccessCookie = cookiePair(firstCallback, 'jdr_hub_access')
    const membershipStart = await app.request('/auth/discord/server', { headers: { cookie: firstAccessCookie } })
    const membershipState = new URL(membershipStart.headers.get('location')!).searchParams.get('state')!
    const secondLogin = await app.request('/auth/discord')
    const secondState = new URL(secondLogin.headers.get('location')!).searchParams.get('state')!
    const secondCallback = await app.request(`/auth/discord/callback?code=second-login&state=${secondState}`)
    const secondAccessCookie = cookiePair(secondCallback, 'jdr_hub_access')

    const wrongSession = await app.request(`/auth/discord/callback?code=membership&state=${membershipState}`, { headers: { cookie: secondAccessCookie } })
    const validSession = await app.request(`/auth/discord/callback?code=membership&state=${membershipState}`, { headers: { cookie: firstAccessCookie } })
    const rejectedOrigin = await app.request('/auth/discord/server/dismiss', { method: 'POST', headers: { cookie: firstAccessCookie, origin: 'https://attacker.example.test' } })
    const dismissed = await app.request('/auth/discord/server/dismiss', { method: 'POST', headers: { cookie: firstAccessCookie, origin: config.appOrigin } })
    const me = await app.request('/me', { headers: { cookie: firstAccessCookie } })

    expect(wrongSession.status).toBe(400)
    expect(validSession.status).toBe(302)
    expect(validSession.headers.get('location')).toBe('/profil?discord=connected')
    expect(discordGuildMembershipClient.addCurrentUser).toHaveBeenCalledOnce()
    expect(rejectedOrigin.status).toBe(403)
    expect(dismissed.status).toBe(204)
    expect(await me.json()).toMatchObject({ data: { discordServerJoined: true, discordServerPromptDismissed: true } })
  })
})
