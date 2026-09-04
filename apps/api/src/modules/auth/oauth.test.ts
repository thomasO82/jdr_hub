import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from './config.js'
import {
  buildDiscordAuthorizationUrl,
  createLoginAttempt,
  verifyLoginAttempt,
} from './oauth.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  NODE_ENV: 'production',
})

const now = new Date('2026-09-03T12:00:00.000Z')

describe('Discord OAuth login attempts', () => {
  it('creates a one-use hashed state and S256 PKCE authorization request', () => {
    const attempt = createLoginAttempt({
      returnTo: '/tableau-de-bord',
      now,
      randomBytes: () => new Uint8Array(32).fill(7),
    })
    const authorizationUrl = buildDiscordAuthorizationUrl(config, attempt)

    expect(attempt.record.stateDigest).not.toBe(attempt.state)
    expect(attempt.record.returnTo).toBe('/tableau-de-bord')
    expect(attempt.record.expiresAt).toEqual(
      new Date('2026-09-03T12:10:00.000Z'),
    )
    expect(authorizationUrl.origin).toBe('https://discord.com')
    expect(authorizationUrl.pathname).toBe('/oauth2/authorize')
    expect(authorizationUrl.searchParams.get('response_type')).toBe('code')
    expect(authorizationUrl.searchParams.get('scope')).toBe('identify')
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'https://jdr-hub.example.test/api/auth/discord/callback',
    )
    expect(authorizationUrl.searchParams.get('state')).toBe(attempt.state)
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authorizationUrl.searchParams.get('code_challenge')).toMatch(
      /^[A-Za-z0-9_-]{43}$/,
    )
  })

  it.each(['https://attacker.example.test', '//attacker.example.test', 'tableau-de-bord'])(
    'rejects an external or malformed post-login destination: %s',
    (returnTo) => {
      expect(() =>
        createLoginAttempt({
          returnTo,
          now,
          randomBytes: () => new Uint8Array(32).fill(7),
        }),
      ).toThrow('returnTo must be an internal path')
    },
  )

  it('rejects invalid, expired, and replayed callback states', () => {
    const attempt = createLoginAttempt({
      returnTo: '/',
      now,
      randomBytes: () => new Uint8Array(32).fill(7),
    })

    expect(verifyLoginAttempt(attempt.record, 'wrong-state', now)).toBe(false)
    expect(
      verifyLoginAttempt(
        { ...attempt.record, expiresAt: new Date('2026-09-03T11:59:59.999Z') },
        attempt.state,
        now,
      ),
    ).toBe(false)
    expect(
      verifyLoginAttempt(
        { ...attempt.record, consumedAt: now },
        attempt.state,
        now,
      ),
    ).toBe(false)
  })
})
