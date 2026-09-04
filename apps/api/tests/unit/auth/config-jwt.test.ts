import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'

const validEnvironment = {
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  NODE_ENV: 'production',
}

describe('JWT authentication configuration', () => {
  it('rejects a missing, short, malformed, or duplicated JWT signing key', () => {
    const { JWT_SIGNING_SECRET: _jwtSigningSecret, ...withoutSigningSecret } = validEnvironment

    expect(() => parseAuthConfig(withoutSigningSecret)).toThrow()
    expect(() => parseAuthConfig({ ...validEnvironment, JWT_SIGNING_SECRET: 'short' })).toThrow()
    expect(() => parseAuthConfig({ ...validEnvironment, JWT_SIGNING_SECRET: 'not_base64url' })).toThrow()
    expect(() =>
      parseAuthConfig({
        ...validEnvironment,
        JWT_PREVIOUS_SIGNING_SECRET: validEnvironment.JWT_SIGNING_SECRET,
      }),
    ).toThrow()
  })

  it('treats an empty previous key from Compose as an absent rotation key', () => {
    expect(parseAuthConfig({ ...validEnvironment, JWT_PREVIOUS_SIGNING_SECRET: '' }))
      .toMatchObject({ previousJwtSigningSecret: null })
  })
})
