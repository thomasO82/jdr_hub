import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from './config.js'
import { createInMemoryAuthRepository } from './repository.js'
import { registerAuthRoutes, type AuthRouteEnv } from './routes.js'
import { getSessionTokenDigest } from './session-service.js'
import { createAccessToken } from './access-token.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  NODE_ENV: 'production',
})

function createTestApp() {
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
    fetchDiscordIdentity: async () => ({
      discordId: '123456789012345678',
      username: 'AventureFictive',
      avatarUrl: null,
    }),
  })
  return { app, repository }
}

function cookiePair(response: Response, name: string): string {
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie') ?? '']
  const cookie = cookies.find((value) => value.startsWith(`${name}=`))
  if (!cookie) throw new Error(`Cookie ${name} is missing`)
  return cookie.split(';', 1)[0]!
}

async function login(app: Hono<AuthRouteEnv>) {
  const start = await app.request('/auth/discord')
  const state = new URL(start.headers.get('location')!).searchParams.get('state')!
  const callback = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
  return {
    callback,
    accessCookie: cookiePair(callback, 'jdr_hub_access'),
    refreshCookie: cookiePair(callback, 'jdr_hub_refresh'),
  }
}

describe('JWT authentication routes', () => {
  it('issues scoped access and refresh cookies after Discord OAuth', async () => {
    const { app } = createTestApp()
    const { callback, accessCookie, refreshCookie } = await login(app)

    expect(callback.status).toBe(302)
    expect(accessCookie).toMatch(/^jdr_hub_access=.+/)
    expect(refreshCookie).toMatch(/^jdr_hub_refresh=.+/)
    expect(callback.headers.getSetCookie()).toEqual(expect.arrayContaining([
      expect.stringContaining('jdr_hub_access='),
      expect.stringContaining('Path=/api'),
      expect.stringContaining('jdr_hub_refresh='),
      expect.stringContaining('Path=/api/auth'),
    ]))
  })

  it('requires a live matching server session for an access JWT and revokes it at logout', async () => {
    const { app } = createTestApp()
    const { accessCookie, refreshCookie } = await login(app)

    expect((await app.request('/me', { headers: { cookie: accessCookie } })).status).toBe(200)
    expect((await app.request('/auth/logout', {
      method: 'POST',
      headers: { cookie: refreshCookie, origin: config.appOrigin },
    })).status).toBe(204)
    expect((await app.request('/me', { headers: { cookie: accessCookie } })).status).toBe(401)
  })

  it('requires a trusted origin, rotates refresh credentials, and rejects their replay', async () => {
    const { app } = createTestApp()
    const { accessCookie, refreshCookie } = await login(app)

    expect((await app.request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: refreshCookie, origin: 'https://attacker.example.test' },
    })).status).toBe(403)
    expect((await app.request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: refreshCookie },
    })).status).toBe(403)

    const refreshed = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: refreshCookie, origin: config.appOrigin },
    })
    const replacementAccessCookie = cookiePair(refreshed, 'jdr_hub_access')
    const replacementRefreshCookie = cookiePair(refreshed, 'jdr_hub_refresh')

    expect(refreshed.status).toBe(204)
    expect((await app.request('/me', { headers: { cookie: accessCookie } })).status).toBe(401)
    expect((await app.request('/me', { headers: { cookie: replacementAccessCookie } })).status).toBe(200)
    expect((await app.request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: refreshCookie, origin: config.appOrigin },
    })).status).toBe(401)
    expect((await app.request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: replacementRefreshCookie, origin: config.appOrigin },
    })).status).toBe(204)
  })

  it('revokes a rotated replacement session when logout receives the predecessor refresh cookie', async () => {
    const { app } = createTestApp()
    const { refreshCookie } = await login(app)
    const refreshed = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: refreshCookie, origin: config.appOrigin },
    })
    const replacementAccessCookie = cookiePair(refreshed, 'jdr_hub_access')
    const replacementRefreshCookie = cookiePair(refreshed, 'jdr_hub_refresh')

    expect((await app.request('/auth/logout', {
      method: 'POST',
      headers: { cookie: refreshCookie, origin: config.appOrigin },
    })).status).toBe(204)
    expect((await app.request('/me', { headers: { cookie: replacementAccessCookie } })).status).toBe(401)
    expect((await app.request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: replacementRefreshCookie, origin: config.appOrigin },
    })).status).toBe(401)
  })

  it('keeps another active device session when logout receives a current refresh cookie', async () => {
    const { app } = createTestApp()
    const first = await login(app)
    const second = await login(app)

    expect((await app.request('/auth/logout', {
      method: 'POST',
      headers: { cookie: first.refreshCookie, origin: config.appOrigin },
    })).status).toBe(204)
    expect((await app.request('/me', { headers: { cookie: first.accessCookie } })).status).toBe(401)
    expect((await app.request('/me', { headers: { cookie: second.accessCookie } })).status).toBe(200)
  })

  it('rejects an access JWT that names the wrong user and an access JWT whose session was revoked server-side', async () => {
    const { app, repository } = createTestApp()
    const { accessCookie, refreshCookie } = await login(app)
    const refreshToken = refreshCookie.slice('jdr_hub_refresh='.length)
    const session = await repository.findSession(getSessionTokenDigest(refreshToken))
    const mismatchedAccessToken = await createAccessToken({
      config,
      sessionId: session!.id,
      userId: '44444444-4444-4444-8444-444444444444',
    })

    expect((await app.request('/me', {
      headers: { cookie: `jdr_hub_access=${mismatchedAccessToken}` },
    })).status).toBe(401)
    await repository.revokeUserSessions(session!.userId, new Date())
    expect((await app.request('/me', { headers: { cookie: accessCookie } })).status).toBe(401)
  })
})
