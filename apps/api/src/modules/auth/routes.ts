import { getCookie, setCookie } from 'hono/cookie'
import type { Context, Hono } from 'hono'
import { z } from 'zod'
import type { AuthConfig } from './config.js'
import type { DiscordIdentity } from './discord-client.js'
import { fetchDiscordIdentity as defaultFetchDiscordIdentity } from './discord-client.js'
import { buildDiscordAuthorizationUrl, createLoginAttempt, hashOAuthState, verifyLoginAttempt } from './oauth.js'
import type { AuthRepository } from './repository.js'
import { createSessionCredential, validateSessionCredential } from './session-service.js'

const COOKIE_NAME = 'jdr_hub_session'
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
      const credential = createSessionCredential({ now: now() })
      await dependencies.repository.createSession(user.id, credential)
      setCookie(c, COOKIE_NAME, credential.token, { httpOnly: true, path: '/', sameSite: 'Lax', secure: dependencies.config.isProduction, expires: credential.absoluteExpiresAt })
      return c.redirect(attempt.returnTo)
    } catch { return error(c, 400) }
  })
  app.get('/me', async (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token) return error(c, 401)
    const currentTime = now()
    const session = await dependencies.repository.findSession(hashOAuthState(token))
    if (!session || !validateSessionCredential(session, token, currentTime)) return error(c, 401)
    await dependencies.repository.touchSession(session.tokenDigest, currentTime)
    const user = await dependencies.repository.findUser(session.userId)
    return user ? c.json({ data: user, error: null, meta: {} }) : error(c, 401)
  })
  app.post('/auth/logout', async (c) => {
    if (c.req.header('origin') !== dependencies.config.appOrigin) return error(c, 403)
    const token = getCookie(c, COOKIE_NAME)
    if (token) await dependencies.repository.revokeSession(hashOAuthState(token), now())
    setCookie(c, COOKIE_NAME, '', { httpOnly: true, path: '/', sameSite: 'Lax', secure: dependencies.config.isProduction, maxAge: 0 })
    return c.body(null, 204)
  })
}
