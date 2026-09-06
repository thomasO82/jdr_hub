import { describe, expect, it, vi } from 'vitest'
import { processDiscordDeliveries, startNotificationWorker } from '../../../src/modules/notifications/worker.js'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'

const delivery = {
  id: 'delivery-1',
  notificationId: 'notification-1',
  recipientDiscordId: '100000000000000001',
  content: 'Une absence a été signalée.',
  channel: 'DISCORD_DM' as const,
  status: 'PENDING' as const,
  attempts: 0,
  nextAttemptAt: null,
  lastErrorCode: null,
}

describe('notification delivery worker', () => {
  it('sends each claimed delivery once and persists the provider id', async () => {
    const repository = createInMemoryNotificationsRepository({ deliveries: [delivery] })
    const notifier = { sendDirectMessage: vi.fn().mockResolvedValue({ providerMessageId: 'discord-message-1' }) }

    await expect(processDiscordDeliveries({ repository, notifier, now: () => new Date('2026-09-06T12:00:00.000Z'), limit: 10 })).resolves.toBe(1)
    expect(notifier.sendDirectMessage).toHaveBeenCalledOnce()
    expect(repository.deliveries[0]).toMatchObject({ status: 'SENT', providerMessageId: 'discord-message-1', attempts: 1 })
  })

  it('retries rate limits and network failures, but dead-letters invalid deliveries after five attempts', async () => {
    const repository = createInMemoryNotificationsRepository({ deliveries: [
      { ...delivery, id: 'rate-limit' },
      { ...delivery, id: 'invalid', attempts: 4 },
    ] })
    const notifier = {
      sendDirectMessage: vi.fn()
        .mockRejectedValueOnce(new Error('DISCORD_RATE_LIMIT'))
        .mockRejectedValueOnce(new Error('DISCORD_INVALID_RECIPIENT')),
    }

    await expect(processDiscordDeliveries({ repository, notifier, now: () => new Date('2026-09-06T12:00:00.000Z'), limit: 10 })).resolves.toBe(2)
    expect(repository.deliveries.find((item) => item.id === 'rate-limit')).toMatchObject({ status: 'PENDING', attempts: 1, lastErrorCode: 'DISCORD_RATE_LIMIT' })
    expect(repository.deliveries.find((item) => item.id === 'invalid')).toMatchObject({ status: 'FAILED', attempts: 5, lastErrorCode: 'DISCORD_INVALID_RECIPIENT' })
  })

  it('does not expose provider details and can be stopped cleanly', async () => {
    const repository = createInMemoryNotificationsRepository({ deliveries: [delivery] })
    const process = vi.fn().mockRejectedValue(new Error('provider secret response'))
    const stop = startNotificationWorker({ process, intervalMs: 1_000_000 })
    stop()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(process).not.toHaveBeenCalled()
  })
})
