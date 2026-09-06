import { describe, expect, it } from 'vitest'
import { parseNotificationConfig } from '../../../src/modules/notifications/config.js'

const baseEnvironment = {
  DISCORD_BOT_TOKEN: 'fake-bot-token',
  NODE_ENV: 'test',
}

describe('notification configuration', () => {
  it('parses a server-only bot token', () => {
    expect(parseNotificationConfig(baseEnvironment)).toEqual({ botToken: 'fake-bot-token', isProduction: false })
  })

  it('ignores unrelated environment variables when parsing the API environment', () => {
    expect(parseNotificationConfig({ ...baseEnvironment, DATABASE_URL: 'postgres://example.test/jdr' }).botToken).toBe('fake-bot-token')
  })

  it('rejects an absent bot token and identifies production', () => {
    expect(() => parseNotificationConfig({ NODE_ENV: 'test' })).toThrow()
    expect(parseNotificationConfig({ ...baseEnvironment, NODE_ENV: 'production' }).isProduction).toBe(true)
  })
})
