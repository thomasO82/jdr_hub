import { describe, expect, it, vi } from 'vitest'
import { createDiscordNotifier } from '../../../src/modules/notifications/discord-client.js'

const config = { botToken: 'fake-bot-token', isProduction: false, intervalMs: 30_000, batchSize: 10 }

describe('Discord notification client', () => {
  it('sends bounded content with mentions disabled', async () => {
    const responses = [new Response('{"id":"dm-1"}'), new Response('{"id":"message-1"}')]
    const fetcher = vi.fn().mockImplementation(async () => responses.shift())
    const notifier = createDiscordNotifier(config, fetcher)
    await expect(notifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'Absence signalée.', idempotencyKey: 'stable-key' })).resolves.toEqual({ providerMessageId: 'message-1' })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetcher.mock.calls[1]?.[1].body as string)).toMatchObject({ content: 'Absence signalée.', nonce: 'stable-key', allowed_mentions: { parse: [] } })
  })

  it('maps rate limits to safe errors and rejects invalid data before network access', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }))
    const notifier = createDiscordNotifier(config, fetcher)
    await expect(notifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'Absence.', idempotencyKey: 'key' })).rejects.toThrow('DISCORD_RATE_LIMIT')
    await expect(notifier.sendDirectMessage({ recipientDiscordId: 'invalid', content: 'Absence.', idempotencyKey: 'key' })).rejects.toThrow('DISCORD_INVALID_RECIPIENT')
    await expect(notifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'x'.repeat(2_001), idempotencyKey: 'key' })).rejects.toThrow('DISCORD_INVALID_CONTENT')
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
