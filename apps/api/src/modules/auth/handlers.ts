import type { Context } from 'hono'
import { z } from 'zod'
import { clearAuthCookies, clearLegacySessionCookie, readAccessToken, readRefreshToken, setAuthCookies } from './cookies.js'
import type { AuthConfig } from './config.js'
import type { DiscordIdentity } from './discord-client.js'
import { fetchDiscordIdentity as defaultFetchDiscordIdentity } from './discord-client.js'
import { createDiscordGuildMembershipClient, type DiscordGuildMembershipClient } from './discord-guild-client.js'
import type { AuthRepository } from './repository.js'
import { authenticateUserSession } from './services/authenticate-user.js'
import { completeDiscordLogin } from './services/complete-discord-login.js'
import { cancelDiscordGuildJoin, completeDiscordGuildJoin, startDiscordGuildMembership } from './services/discord-guild-membership.js'
import { logoutSession } from './services/logout-session.js'
import { refreshSession } from './services/refresh-session.js'
import { startDiscordLogin } from './services/start-discord-login.js'

const callbackQuerySchema = z.object({
  code: z.string().min(1).max(2_048).optional(),
  error: z.string().min(1).max(128).optional(),
  state: z.string().min(1).max(512),
}).refine((input) => Boolean(input.code) !== Boolean(input.error))

export type AuthDependencies = {
  config: AuthConfig
  discordGuildMembershipClient?: DiscordGuildMembershipClient
  fetchDiscordIdentity?: (input: { code: string; codeVerifier: string; config: AuthConfig }) => Promise<DiscordIdentity>
  now?: () => Date
  repository: AuthRepository
}

type AuthRouteEnv = { Variables: { requestId: string } }

function error(c: Context<AuthRouteEnv>, status: 400 | 401 | 403 | 429) {
  return c.json({ data: null, error: { code: 'AUTH_ERROR', message: 'Authentication failed' }, meta: { requestId: c.get('requestId') } }, status)
}

export function createAuthHandlers(dependencies: AuthDependencies) {
  const now = dependencies.now ?? (() => new Date())
  const fetchDiscordIdentity = dependencies.fetchDiscordIdentity ?? defaultFetchDiscordIdentity
  const discordGuildMembershipClient = dependencies.discordGuildMembershipClient ?? createDiscordGuildMembershipClient()
  const membershipRateLimits = new Map<string, { startedAt: number; count: number }>()

  const allowMembershipRequest = (userId: string, action: 'start' | 'callback'): boolean => {
    const key = `${userId}:${action}`
    const currentTime = Date.now()
    const current = membershipRateLimits.get(key)
    if (!current || currentTime - current.startedAt >= 60_000) {
      membershipRateLimits.set(key, { startedAt: currentTime, count: 1 })
      return true
    }
    if (current.count >= (action === 'start' ? 5 : 10)) return false
    current.count += 1
    return true
  }

  const currentSession = async (c: Context<AuthRouteEnv>) => {
    const token = readAccessToken(c)
    return token ? authenticateUserSession({ config: dependencies.config, now: now(), repository: dependencies.repository, token }) : null
  }

  return {
    discordLogin: async (c: Context<AuthRouteEnv>) => {
      try {
        return c.redirect(await startDiscordLogin({ config: dependencies.config, now: now(), repository: dependencies.repository, returnTo: c.req.query('returnTo') ?? '/' }))
      } catch { return error(c, 400) }
    },
    discordCallback: async (c: Context<AuthRouteEnv>) => {
      const parsed = callbackQuerySchema.safeParse(c.req.query())
      if (!parsed.success) return error(c, 400)
      const session = await currentSession(c)

      if (parsed.data.error) {
        if (!session) return error(c, 401)
        if (!allowMembershipRequest(session.user.id, 'callback')) return error(c, 429)
        try {
          const redirectTo = await cancelDiscordGuildJoin({
            state: parsed.data.state,
            sessionId: session.sessionId,
            sessionUserId: session.user.id,
            outcome: parsed.data.error === 'access_denied' ? 'declined' : 'unavailable',
            repository: dependencies.repository,
            now,
          })
          return redirectTo ? c.redirect(redirectTo) : error(c, 400)
        } catch { return error(c, 400) }
      }

      if (!parsed.data.code) return error(c, 400)
      if (session) {
        if (!allowMembershipRequest(session.user.id, 'callback')) return error(c, 429)
        try {
          const membershipRedirect = await completeDiscordGuildJoin({
            code: parsed.data.code,
            state: parsed.data.state,
            sessionId: session.sessionId,
            sessionUserId: session.user.id,
            config: dependencies.config,
            repository: dependencies.repository,
            client: discordGuildMembershipClient,
            now,
          })
          if (membershipRedirect) return c.redirect(membershipRedirect)
        } catch (value) {
          if (value instanceof Error && ['DISCORD_OAUTH_FAILED', 'DISCORD_GUILD_JOIN_FAILED', 'DISCORD_GUILD_NOT_CONFIGURED'].includes(value.message)) {
            return c.redirect('/profil?discord=unavailable')
          }
          return error(c, 400)
        }
      }
      try {
        const login = await completeDiscordLogin({ code: parsed.data.code, state: parsed.data.state, config: dependencies.config, fetchDiscordIdentity, now, repository: dependencies.repository })
        if (!login) return error(c, 400)
        setAuthCookies(c, dependencies.config, login.accessToken, login.refreshToken, login.refreshExpiresAt, now())
        clearLegacySessionCookie(c, dependencies.config)
        return c.redirect(login.redirectTo)
      } catch { return error(c, 400) }
    },
    getCurrentUser: async (c: Context<AuthRouteEnv>) => {
      const session = await currentSession(c)
      if (!session) return error(c, 401)
      const membership = await dependencies.repository.getDiscordGuildMembership(session.user.id)
      return c.json({ data: {
        ...session.user,
        discordServerJoined: membership.joinedAt !== null,
        discordServerPromptDismissed: membership.promptDismissedAt !== null,
      }, error: null, meta: { requestId: c.get('requestId') } })
    },
    startDiscordGuildMembership: async (c: Context<AuthRouteEnv>) => {
      const session = await currentSession(c)
      if (!session) return error(c, 401)
      if (!allowMembershipRequest(session.user.id, 'start')) return error(c, 429)
      try {
        return c.redirect(await startDiscordGuildMembership({
          config: dependencies.config,
          now: now(),
          repository: dependencies.repository,
          sessionId: session.sessionId,
          userId: session.user.id,
        }))
      } catch (value) {
        if (value instanceof Error && value.message === 'DISCORD_GUILD_NOT_CONFIGURED') return c.redirect('/profil?discord=unavailable')
        return error(c, 400)
      }
    },
    dismissDiscordGuildMembership: async (c: Context<AuthRouteEnv>) => {
      if (c.req.header('origin') !== dependencies.config.appOrigin) return error(c, 403)
      const session = await currentSession(c)
      if (!session) return error(c, 401)
      await dependencies.repository.markDiscordGuildPromptDismissed(session.user.id, now())
      return c.body(null, 204)
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
