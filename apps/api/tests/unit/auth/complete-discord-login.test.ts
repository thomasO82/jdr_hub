import { describe, expect, it } from 'vitest'
import { completeDiscordLogin } from '../../../src/modules/auth/services/complete-discord-login.js'
import { createLoginAttempt, hashOAuthState } from '../../../src/modules/auth/services/oauth.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'

const now = new Date('2026-09-05T12:00:00.000Z')
const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})

it('accepts a callback when PostgreSQL returns the consumed attempt', async () => {
  const base = createInMemoryAuthRepository()
  const attempt = createLoginAttempt({ now, returnTo: '/' })
  await base.createLoginAttempt(attempt.record)
  const repository = {
    ...base,
    async consumeLoginAttempt(stateDigest: string, consumedAt: Date) {
      const value = await base.consumeLoginAttempt(stateDigest, consumedAt)
      return value ? { ...value, consumedAt } : null
    },
  }

  const result = await completeDiscordLogin({
    code: 'test-code', config, now: () => now, repository,
    state: attempt.state,
    fetchDiscordIdentity: async () => ({ discordId: '123456789012345678', username: 'AventureFictive', avatarUrl: null }),
  })

  expect(result?.redirectTo).toBe('/')
  expect(await base.consumeLoginAttempt(hashOAuthState(attempt.state), now)).toBeNull()
})
