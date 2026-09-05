const MINUTE_MS = 60 * 1_000
const DAY_MS = 24 * 60 * MINUTE_MS
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

/** Security lifetimes shared by the browser cookies and server-side sessions. */
export const AUTH_LIFETIMES = {
  accessTokenMs: ACCESS_TOKEN_TTL_SECONDS * 1_000,
  accessTokenSeconds: ACCESS_TOKEN_TTL_SECONDS,
  oauthAttemptMs: 10 * MINUTE_MS,
  sessionAbsoluteMs: 30 * DAY_MS,
  sessionIdleMs: 7 * DAY_MS,
} as const
