import {
  createHash,
  randomBytes as createRandomBytes,
  timingSafeEqual,
} from 'node:crypto'
import type { AuthConfig } from './config.js'
import { AUTH_LIFETIMES } from './policy.js'

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize'

type RandomBytes = () => Uint8Array

export type OAuthLoginAttempt = {
  codeVerifier: string
  consumedAt: Date | null
  expiresAt: Date
  returnTo: string
  stateDigest: string
}

export type NewOAuthLoginAttempt = {
  record: OAuthLoginAttempt
  state: string
}

function encodeRandomBytes(randomBytes: RandomBytes): string {
  return Buffer.from(randomBytes()).toString('base64url')
}

export function hashOAuthState(secret: string): string {
  return createHash('sha256').update(secret).digest('base64url')
}

function hasSameDigest(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return (
    leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function normalizeInternalReturnPath(returnTo: string): string {
  if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\')) {
    throw new Error('returnTo must be an internal path')
  }

  const parsed = new URL(returnTo, 'https://jdr-hub.invalid')
  if (parsed.origin !== 'https://jdr-hub.invalid') {
    throw new Error('returnTo must be an internal path')
  }

  return `${parsed.pathname}${parsed.search}`
}

/** Creates the state and PKCE material for a single, short-lived OAuth login. */
export function createLoginAttempt({
  now,
  randomBytes = () => createRandomBytes(32),
  returnTo,
}: {
  now: Date
  randomBytes?: RandomBytes
  returnTo: string
}): NewOAuthLoginAttempt {
  const state = encodeRandomBytes(randomBytes)
  const codeVerifier = encodeRandomBytes(randomBytes)

  return {
    state,
    record: {
      stateDigest: hashOAuthState(state),
      codeVerifier,
      returnTo: normalizeInternalReturnPath(returnTo),
      expiresAt: new Date(now.getTime() + AUTH_LIFETIMES.oauthAttemptMs),
      consumedAt: null,
    },
  }
}

/** Builds Discord's authorization-code URL with only the minimal identify scope. */
export function buildDiscordAuthorizationUrl(
  config: AuthConfig,
  attempt: NewOAuthLoginAttempt,
): URL {
  const url = new URL(DISCORD_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('scope', 'identify')
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('state', attempt.state)
  url.searchParams.set('code_challenge', hashOAuthState(attempt.record.codeVerifier))
  url.searchParams.set('code_challenge_method', 'S256')
  return url
}

/** Validates a callback state without revealing whether a stored attempt exists. */
export function verifyLoginAttempt(
  attempt: OAuthLoginAttempt,
  returnedState: string,
  now: Date,
): boolean {
  if (attempt.consumedAt || attempt.expiresAt.getTime() <= now.getTime()) {
    return false
  }

  return hasSameDigest(attempt.stateDigest, hashOAuthState(returnedState))
}
