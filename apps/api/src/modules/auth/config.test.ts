import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from './config.js'

const validEnvironment = {
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  NODE_ENV: 'production',
}

describe('authentication configuration', () => {
  it('derives a single strict Discord callback from the public origin', () => {
    expect(parseAuthConfig(validEnvironment)).toMatchObject({
      appOrigin: 'https://jdr-hub.example.test',
      redirectUri: 'https://jdr-hub.example.test/api/auth/discord/callback',
      isProduction: true,
    })
  })

  it('rejects a configured callback outside the public origin', () => {
    expect(() =>
      parseAuthConfig({
        ...validEnvironment,
        DISCORD_REDIRECT_URI: 'https://attacker.example.test/callback',
      }),
    ).toThrow('DISCORD_REDIRECT_URI must match the fixed callback URL')
  })
})
