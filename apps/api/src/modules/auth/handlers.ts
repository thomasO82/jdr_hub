import type { Context } from 'hono'
import { z } from 'zod'
import { clearAuthCookies, clearLegacySessionCookie, readAccessToken, readRefreshToken, setAuthCookies } from './cookies.js'
import type { AuthConfig } from './config.js'
import type { DiscordIdentity } from './discord-client.js'
import { fetchDiscordIdentity as defaultFetchDiscordIdentity } from './discord-client.js'
import type { AuthRepository } from './repository.js'
import { authenticateUser } from './services/authenticate-user.js'
import { completeDiscordLogin } from './services/complete-discord-login.js'
import { logoutSession } from './services/logout-session.js'
import { refreshSession } from './services/refresh-session.js'
import { startDiscordLogin } from './services/start-discord-login.js'

const callbackQuerySchema = z.object({ code: z.string().min(1).max(2_048), state: z.string().min(1).max(512) })

export type AuthDependencies = {
  config: AuthConfig
  fetchDiscordIdentity?: (input: { code: string; codeVerifier: string; config: AuthConfig }) => Promise<DiscordIdentity>
  now?: () => Date
  repository: AuthRepository
}

type AuthRouteEnv = { Variables: { requestId: string } }

function error(c: Context<AuthRouteEnv>, status: 400 | 401 | 403) {
  return c.json({ data: null, error: { code: 'AUTH_ERROR', message: 'Authentication failed' }, meta: { requestId: c.get('requestId') } }, status)
}

export function createAuthHandlers(dependencies: AuthDependencies) {
  const now = dependencies.now ?? (() => new Date())
  const fetchDiscordIdentity = dependencies.fetchDiscordIdentity ?? defaultFetchDiscordIdentity
  return {
    discordLogin: async (c: Context<AuthRouteEnv>) => {
      try {
        return c.redirect(await startDiscordLogin({ config: dependencies.config, now: now(), repository: dependencies.repository, returnTo: c.req.query('returnTo') ?? '/' }))
      } catch { return error(c, 400) }
    },
    discordCallback: async (c: Context<AuthRouteEnv>) => {
      const parsed = callbackQuerySchema.safeParse(c.req.query())
      if (!parsed.success) return error(c, 400)
      try {
        const login = await completeDiscordLogin({ ...parsed.data, config: dependencies.config, fetchDiscordIdentity, now, repository: dependencies.repository })
        if (!login) return error(c, 400)
        setAuthCookies(c, dependencies.config, login.accessToken, login.refreshToken, login.refreshExpiresAt, now())
        clearLegacySessionCookie(c, dependencies.config)
        return c.redirect(login.redirectTo)
      } catch { return error(c, 400) }
    },
    getCurrentUser: async (c: Context<AuthRouteEnv>) => {
      const token = readAccessToken(c)
      const user = token ? await authenticateUser({ config: dependencies.config, now: now(), repository: dependencies.repository, token }) : null
      return user ? c.json({ data: user, error: null, meta: { requestId: c.get('requestId') } }) : error(c, 401)
    },
    logout: async (c: Context<AuthRouteEnv>) => {
      if (c.req.header('origin') !== dependencies.config.appOrigin) return error(c, 403)
      await logoutSession({ now: now(), repository: dependencies.repository, refreshToken: readRefreshToken(c) })
      clearAuthCookies(c, dependencies.config)
      return c.body(null, 204)
    },
    refreshSession: async (c: Context<AuthRouteEnv>) => {
      if (c.req.header('origin') !== dependencies.config.appOrigin) return error(c, 403)
      const token = readRefreshToken(c)
      if (!token) return error(c, 401)
      const currentTime = now()
      const refreshed = await refreshSession({ config: dependencies.config, now: currentTime, repository: dependencies.repository, refreshToken: token })
      if (!refreshed) return error(c, 401)
      setAuthCookies(c, dependencies.config, refreshed.accessToken, refreshed.refreshToken, refreshed.refreshExpiresAt, currentTime)
      return c.body(null, 204)
    },
  }
}
