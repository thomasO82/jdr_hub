import { getCookie, setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { AuthConfig } from './config.js'
import { AUTH_LIFETIMES } from './policy.js'

const ACCESS_COOKIE_NAME = 'jdr_hub_access'
const LEGACY_COOKIE_NAME = 'jdr_hub_session'
const REFRESH_COOKIE_NAME = 'jdr_hub_refresh'

export function readAccessToken(c: Context): string | undefined {
  return getCookie(c, ACCESS_COOKIE_NAME)
}

export function readRefreshToken(c: Context): string | undefined {
  return getCookie(c, REFRESH_COOKIE_NAME)
}

export function setAuthCookies(
  c: Context,
  config: AuthConfig,
  accessToken: string,
  refreshToken: string,
  refreshExpiresAt: Date,
  now: Date,
): void {
  setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
    expires: new Date(now.getTime() + AUTH_LIFETIMES.accessTokenMs),
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

/** Removes every browser credential, including the retired legacy session cookie. */
export function clearAuthCookies(c: Context, config: AuthConfig): void {
  for (const [name, path] of [
    [ACCESS_COOKIE_NAME, '/api'],
    [REFRESH_COOKIE_NAME, '/api/auth'],
    [LEGACY_COOKIE_NAME, '/'],
  ] as const) {
    setCookie(c, name, '', { httpOnly: true, maxAge: 0, path, sameSite: 'Lax', secure: config.isProduction })
  }
}

/** Retires only the predecessor cookie after a successful OAuth callback. */
export function clearLegacySessionCookie(c: Context, config: AuthConfig): void {
  setCookie(c, LEGACY_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/', sameSite: 'Lax', secure: config.isProduction })
}
