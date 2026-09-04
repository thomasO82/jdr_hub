import { getCookie, setCookie } from 'hono/cookie'
import type { Context, Hono } from 'hono'
import { z } from 'zod'
import type { AuthConfig } from './config.js'
import type { DiscordIdentity } from './discord-client.js'
import { fetchDiscordIdentity as defaultFetchDiscordIdentity } from './discord-client.js'
import { buildDiscordAuthorizationUrl, createLoginAttempt, hashOAuthState, verifyLoginAttempt } from './oauth.js'
import type { AuthRepository } from './repository.js'
import { createAccessToken, verifyAccessToken } from './access-token.js'
import {
  createSessionCredential,
  getSessionTokenDigest,
  isSessionActive,
  validateSessionCredential,
} from './session-service.js'

const ACCESS_COOKIE_NAME = 'jdr_hub_access'
const LEGACY_COOKIE_NAME = 'jdr_hub_session'
const REFRESH_COOKIE_NAME = 'jdr_hub_refresh'
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1_000
const callbackQuerySchema = z.object({ code: z.string().min(1).max(2_048), state: z.string().min(1).max(512) })

type RouteDependencies = {
  config: AuthConfig
  fetchDiscordIdentity?: (input: { code: string; codeVerifier: string; config: AuthConfig }) => Promise<DiscordIdentity>
  now?: () => Date
  repository: AuthRepository
}

export type AuthRouteEnv = { Variables: { requestId: string } }

function error(c: Context<AuthRouteEnv>, status: 400 | 401 | 403) {
  return c.json(
    {
      data: null,
      error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
      meta: { requestId: c.get('requestId') },
    },
    status,
  )
}

function setAuthenticationCookiesWithRefreshCredential(
  c: Context<AuthRouteEnv>,
  config: AuthConfig,
  accessToken: string,
  refreshToken: string,
  refreshExpiresAt: Date,
  now: Date,
) {
  setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
    expires: new Date(now.getTime() + ACCESS_TOKEN_TTL_MS),
    httpOnly: true,
    path: '/api',
    sameSite: 'Lax',
    secure: config.isProduction,
  })
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    expires: refreshExpiresAt,
    httpOnly: true,
    path: '/api/auth',
    sameSite: 'Lax',
    secure: config.isProduction,
  })
}

function clearAuthenticationCookies(c: Context<AuthRouteEnv>, config: AuthConfig) {
  for (const [name, path] of [
    [ACCESS_COOKIE_NAME, '/api'],
    [REFRESH_COOKIE_NAME, '/api/auth'],
    [LEGACY_COOKIE_NAME, '/'],
  ] as const) {
    setCookie(c, name, '', { httpOnly: true, maxAge: 0, path, sameSite: 'Lax', secure: config.isProduction })
  }
}

export function registerAuthRoutes(app: Hono<AuthRouteEnv>, dependencies: RouteDependencies): void {
  const now = dependencies.now ?? (() => new Date())
  const fetchDiscordIdentity = dependencies.fetchDiscordIdentity ?? defaultFetchDiscordIdentity
  app.get('/auth/discord', async (c) => {
    try {
      const attempt = createLoginAttempt({ returnTo: c.req.query('returnTo') ?? '/', now: now() })
      await dependencies.repository.createLoginAttempt(attempt.record)
      return c.redirect(buildDiscordAuthorizationUrl(dependencies.config, attempt).toString())
    } catch { return error(c, 400) }
  })
  app.get('/auth/discord/callback', async (c) => {
    const parsed = callbackQuerySchema.safeParse(c.req.query())
    if (!parsed.success) return error(c, 400)
    const attempt = await dependencies.repository.consumeLoginAttempt(hashOAuthState(parsed.data.state), now())
    if (!attempt || !verifyLoginAttempt(attempt, parsed.data.state, now())) return error(c, 400)
    try {
      const identity = await fetchDiscordIdentity({ code: parsed.data.code, codeVerifier: attempt.codeVerifier, config: dependencies.config })
      const user = await dependencies.repository.upsertDiscordUser(identity, now())
      const currentTime = now()
      const credential = createSessionCredential({ now: currentTime })
      await dependencies.repository.createSession(user.id, credential)
      const accessToken = await createAccessToken({
        config: dependencies.config,
        now: currentTime,
        sessionId: credential.id,
        userId: user.id,
      })
      setAuthenticationCookiesWithRefreshCredential(c, dependencies.config, accessToken, credential.token, credential.absoluteExpiresAt, currentTime)
      setCookie(c, LEGACY_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/', sameSite: 'Lax', secure: dependencies.config.isProduction })
      return c.redirect(attempt.returnTo)
    } catch { return error(c, 400) }
  })
  app.get('/me', async (c) => {
    const token = getCookie(c, ACCESS_COOKIE_NAME)
    if (!token) return error(c, 401)
    const currentTime = now()
    const accessToken = await verifyAccessToken({ config: dependencies.config, token })
    if (!accessToken) return error(c, 401)
    const session = await dependencies.repository.findSessionById(accessToken.sessionId)
    if (!session || session.userId !== accessToken.userId || !isSessionActive(session, currentTime)) return error(c, 401)
    await dependencies.repository.touchSession(session.tokenDigest, currentTime)
    const user = await dependencies.repository.findUser(session.userId)
    return user ? c.json({ data: user, error: null, meta: { requestId: c.get('requestId') } }) : error(c, 401)
  })
  app.post('/auth/logout', async (c) => {
    if (c.req.header('origin') !== dependencies.config.appOrigin) return error(c, 403)
    const token = getCookie(c, REFRESH_COOKIE_NAME)
    if (token) {
      await dependencies.repository.logoutSession(getSessionTokenDigest(token), now())
    }
    clearAuthenticationCookies(c, dependencies.config)
    return c.body(null, 204)
  })

  app.post('/auth/refresh', async (c) => {
    if (c.req.header('origin') !== dependencies.config.appOrigin) return error(c, 403)
    const token = getCookie(c, REFRESH_COOKIE_NAME)
    if (!token) return error(c, 401)
    const currentTime = now()
    const session = await dependencies.repository.findSession(getSessionTokenDigest(token))
    if (!session || !validateSessionCredential(session, token, currentTime)) return error(c, 401)

    const replacement = createSessionCredential({ now: currentTime })
    const rotated = await dependencies.repository.rotateSession(session.tokenDigest, replacement, currentTime)
    if (!rotated) return error(c, 401)
    const accessToken = await createAccessToken({
      config: dependencies.config,
      now: currentTime,
      sessionId: rotated.id,
      userId: rotated.userId,
    })
    setAuthenticationCookiesWithRefreshCredential(c, dependencies.config, accessToken, replacement.token, rotated.absoluteExpiresAt, currentTime)
    return c.body(null, 204)
  })
}
