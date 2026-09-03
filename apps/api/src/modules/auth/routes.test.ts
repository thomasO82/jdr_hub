import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from './config.js'
import { createInMemoryAuthRepository } from './repository.js'
import { registerAuthRoutes, type AuthRouteEnv } from './routes.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  NODE_ENV: 'production',
})

function createTestApp() {
  const app = new Hono<AuthRouteEnv>()
  const repository = createInMemoryAuthRepository()
  registerAuthRoutes(app, {
    config,
    now: () => new Date('2026-09-03T12:00:00.000Z'),
    repository,
    fetchDiscordIdentity: async () => ({
      discordId: '123456789012345678',
      username: 'AventureFictive',
      avatarUrl: null,
    }),
  })
  return { app, repository }
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

  it('creates a local secure session only after a valid callback and returns it from /me', async () => {
    const { app } = createTestApp()
    const start = await app.request('/auth/discord?returnTo=/tableau-de-bord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
    const cookie = callback.headers.get('set-cookie')!
    const me = await app.request('/me', { headers: { cookie } })

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/tableau-de-bord')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(await me.json()).toMatchObject({
      data: { username: 'AventureFictive', timezone: 'Europe/Paris' },
      error: null,
    })
  })

  it('rejects a replayed callback and missing session', async () => {
    const { app } = createTestApp()
    const start = await app.request('/auth/discord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
    const replay = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)

    expect(replay.status).toBe(400)
    expect((await app.request('/me')).status).toBe(401)
  })

  it('requires the trusted origin to logout and revokes the current session', async () => {
    const { app } = createTestApp()
    const start = await app.request('/auth/discord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
    const cookie = callback.headers.get('set-cookie')!

    expect(
      (await app.request('/auth/logout', { method: 'POST', headers: { cookie, origin: 'https://attacker.example.test' } })).status,
    ).toBe(403)
    expect(
      (await app.request('/auth/logout', { method: 'POST', headers: { cookie, origin: config.appOrigin } })).status,
    ).toBe(204)
    expect((await app.request('/me', { headers: { cookie } })).status).toBe(401)
  })
})
