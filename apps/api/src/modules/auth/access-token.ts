import { randomUUID } from 'node:crypto'
import { sign, verify } from 'hono/jwt'
import { z } from 'zod'
import type { AuthConfig } from './config.js'
import { AUTH_LIFETIMES } from './policy.js'

const ACCESS_TOKEN_AUDIENCE = 'jdr-hub-api'
const ACCESS_TOKEN_PURPOSE = 'jdr-hub-access'
const MAX_ACCESS_TOKEN_LENGTH = 4_096

const accessTokenClaimsSchema = z.object({
  aud: z.literal(ACCESS_TOKEN_AUDIENCE),
  exp: z.number().int().nonnegative(),
  iat: z.number().int().nonnegative(),
  iss: z.string().url(),
  jti: z.string().uuid(),
  nbf: z.number().int().nonnegative(),
  sid: z.string().uuid(),
  sub: z.string().uuid(),
  token_use: z.literal(ACCESS_TOKEN_PURPOSE),
}).strict()

function getUnixSeconds(now: Date): number {
  return Math.floor(now.getTime() / 1_000)
}

/** Creates a short-lived JWT that identifies, but never authorizes, a live application session. */
export async function createAccessToken({
  config,
  now = new Date(),
  sessionId,
  userId,
}: {
  config: AuthConfig
  now?: Date
  sessionId: string
  userId: string
}): Promise<string> {
  const issuedAt = getUnixSeconds(now)

  return sign({
    aud: ACCESS_TOKEN_AUDIENCE,
    exp: issuedAt + AUTH_LIFETIMES.accessTokenSeconds,
    iat: issuedAt,
    iss: config.appOrigin,
    jti: randomUUID(),
    nbf: issuedAt,
    sid: sessionId,
    sub: userId,
    token_use: ACCESS_TOKEN_PURPOSE,
  }, config.jwtSigningSecret, 'HS256')
}

async function verifyWithSigningKey(config: AuthConfig, token: string, signingKey: string) {
  return verify(token, signingKey, {
    alg: 'HS256',
    aud: ACCESS_TOKEN_AUDIENCE,
    iss: config.appOrigin,
  })
}

/** Verifies cryptographic claims and returns only the identifiers needed for server-side session lookup. */
export async function verifyAccessToken({
  config,
  token,
}: {
  config: AuthConfig
  token: string
}): Promise<{ sessionId: string; userId: string } | null> {
  if (token.length > MAX_ACCESS_TOKEN_LENGTH) return null

  try {
    let claims
    try {
      claims = await verifyWithSigningKey(config, token, config.jwtSigningSecret)
    } catch {
      if (!config.previousJwtSigningSecret) return null
      claims = await verifyWithSigningKey(config, token, config.previousJwtSigningSecret)
    }

    const parsed = accessTokenClaimsSchema.safeParse(claims)
    if (!parsed.success) return null

    return { sessionId: parsed.data.sid, userId: parsed.data.sub }
  } catch {
    return null
  }
}
