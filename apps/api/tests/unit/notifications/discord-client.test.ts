import { describe, expect, it, vi } from 'vitest'
import { createDiscordNotifier } from '../../../src/modules/notifications/discord-client.js'

const config = { botToken: 'fake-bot-token', isProduction: false }

describe('Discord notification client', () => {
  it('opens a DM and sends a message with mentions disabled', async () => {
    const responses = [
      new Response(JSON.stringify({ id: 'dm-channel-1' }), { status: 200 }),
      new Response(JSON.stringify({ id: 'dm-message-1' }), { status: 200 }),
    ]
    const fetcher = vi.fn().mockImplementation(async () => responses.shift())
    const notifier = createDiscordNotifier(config, fetcher)

    await expect(notifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'Une absence a été signalée.', idempotencyKey: 'absence-1' })).resolves.toEqual({ providerMessageId: 'dm-message-1' })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0][0]).toBe('https://discord.com/api/v10/users/@me/channels')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bot fake-bot-token')
    expect(fetcher.mock.calls[1][0]).toBe('https://discord.com/api/v10/channels/dm-channel-1/messages')
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ content: 'Une absence a été signalée.', nonce: 'absence-1', allowed_mentions: { parse: [] } })
  })

  it('maps Discord rate limits and malformed responses to safe internal errors', async () => {
    const rateLimitedFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ retry_after: 1 }), { status: 429 }))
    const rateLimitedNotifier = createDiscordNotifier(config, rateLimitedFetch)
    await expect(rateLimitedNotifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'Absence.', idempotencyKey: 'absence-2' })).rejects.toThrow('DISCORD_RATE_LIMIT')

    const malformedFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const malformedNotifier = createDiscordNotifier(config, malformedFetch)
    await expect(malformedNotifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'Absence.', idempotencyKey: 'absence-3' })).rejects.toThrow('DISCORD_UNAVAILABLE')
    expect(String(malformedFetch.mock.results[0])).not.toContain('fake-bot-token')
  })

  it('rejects invalid recipients and oversized content before network access', async () => {
    const fetcher = vi.fn()
    const notifier = createDiscordNotifier(config, fetcher)
    await expect(notifier.sendDirectMessage({ recipientDiscordId: 'invalid', content: 'Absence.', idempotencyKey: 'absence-4' })).rejects.toThrow('DISCORD_INVALID_RECIPIENT')
    await expect(notifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'x'.repeat(2_001), idempotencyKey: 'absence-5' })).rejects.toThrow('DISCORD_INVALID_CONTENT')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
