import { sign } from 'hono/jwt'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken, verifyAccessToken } from '../../../src/modules/auth/services/access-token.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  JWT_PREVIOUS_SIGNING_SECRET: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE',
})

const userId = '22222222-2222-4222-8222-222222222222'
const sessionId = '11111111-1111-4111-8111-111111111111'

describe('JWT access tokens', () => {
  it('accepts a current HS256 access token with a valid server-side identity binding', async () => {
    const token = await createAccessToken({ config, sessionId, userId })

    await expect(verifyAccessToken({ config, token })).resolves.toEqual({ sessionId, userId })
  })

  it('rejects a token with an invalid access-token purpose, malformed identity claims, or a future issue time', async () => {
    const now = Math.floor(Date.now() / 1_000)
    const commonClaims = {
      aud: 'jdr-hub-api',
      exp: now + 900,
      iss: config.appOrigin,
      jti: '33333333-3333-4333-8333-333333333333',
      nbf: now,
      sid: sessionId,
      sub: userId,
    }
    const wrongPurpose = await sign({ ...commonClaims, iat: now, token_use: 'password-reset' }, config.jwtSigningSecret, 'HS256')
    const malformedSubject = await sign({ ...commonClaims, iat: now, sub: 'not-a-uuid', token_use: 'jdr-hub-access' }, config.jwtSigningSecret, 'HS256')
    const futureIssued = await sign({ ...commonClaims, iat: now + 60, nbf: now + 60, token_use: 'jdr-hub-access' }, config.jwtSigningSecret, 'HS256')

    await expect(verifyAccessToken({ config, token: wrongPurpose })).resolves.toBeNull()
    await expect(verifyAccessToken({ config, token: malformedSubject })).resolves.toBeNull()
    await expect(verifyAccessToken({ config, token: futureIssued })).resolves.toBeNull()
  })

  it('permits a valid token signed with the temporary previous signing key', async () => {
    const now = Math.floor(Date.now() / 1_000)
    const token = await sign({
      aud: 'jdr-hub-api',
      exp: now + 900,
      iat: now,
      iss: config.appOrigin,
      jti: '33333333-3333-4333-8333-333333333333',
      nbf: now,
      sid: sessionId,
      sub: userId,
      token_use: 'jdr-hub-access',
    }, config.previousJwtSigningSecret!, 'HS256')

    await expect(verifyAccessToken({ config, token })).resolves.toEqual({ sessionId, userId })
  })

  it('rejects tampered, expired, wrongly scoped, incomplete, and oversized access-token input', async () => {
    const now = Math.floor(Date.now() / 1_000)
    const validClaims = {
      aud: 'jdr-hub-api',
      exp: now + 900,
      iat: now,
      iss: config.appOrigin,
      jti: '33333333-3333-4333-8333-333333333333',
      nbf: now,
      sid: sessionId,
      sub: userId,
      token_use: 'jdr-hub-access',
    }
    const validToken = await sign(validClaims, config.jwtSigningSecret, 'HS256')
    const expiredToken = await sign({ ...validClaims, exp: now - 1 }, config.jwtSigningSecret, 'HS256')
    const wrongIssuer = await sign({ ...validClaims, iss: 'https://other.example.test' }, config.jwtSigningSecret, 'HS256')
    const wrongAudience = await sign({ ...validClaims, aud: 'other-api' }, config.jwtSigningSecret, 'HS256')
    const missingPurpose = await sign({ ...validClaims, token_use: undefined }, config.jwtSigningSecret, 'HS256')

    await expect(verifyAccessToken({ config, token: `${validToken}x` })).resolves.toBeNull()
    await expect(verifyAccessToken({ config, token: expiredToken })).resolves.toBeNull()
    await expect(verifyAccessToken({ config, token: wrongIssuer })).resolves.toBeNull()
    await expect(verifyAccessToken({ config, token: wrongAudience })).resolves.toBeNull()
    await expect(verifyAccessToken({ config, token: missingPurpose })).resolves.toBeNull()
    await expect(verifyAccessToken({ config, token: 'a'.repeat(4_097) })).resolves.toBeNull()
  })
})
