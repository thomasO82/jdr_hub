import { describe, expect, it } from 'vitest'
import { parseNotificationConfig } from '../../../src/modules/notifications/config.js'

describe('Discord notification configuration', () => {
  it('keeps the app usable when no Discord bot token is configured', () => {
    expect(parseNotificationConfig({ NODE_ENV: 'test' })).toBeNull()
  })

  it('validates and parses server-only worker configuration', () => {
    expect(parseNotificationConfig({ DISCORD_BOT_TOKEN: 'fake-token', NODE_ENV: 'production' })).toEqual({
      botToken: 'fake-token', batchSize: 10, intervalMs: 30_000, isProduction: true,
    })
    expect(() => parseNotificationConfig({ DISCORD_BOT_TOKEN: 'token', DISCORD_NOTIFICATION_BATCH_LIMIT: '101' })).toThrow()
  })
})
