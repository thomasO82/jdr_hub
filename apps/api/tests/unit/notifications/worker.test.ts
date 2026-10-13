import { describe, expect, it, vi } from 'vitest'
import { createDeliveryIdempotencyKey, processDiscordDeliveries } from '../../../src/modules/notifications/worker.js'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'

const delivery = {
  id: 'delivery-1', notificationId: 'notification-1', recipientDiscordId: '100000000000000001',
  content: 'Absence signalée.', channel: 'DISCORD_DM' as const, status: 'PENDING' as const,
  attempts: 0, processingAt: null, nextAttemptAt: null, providerMessageId: null, lastErrorCode: null,
}

describe('Discord notification worker', () => {
  it('sends a claimed delivery once and stores the provider message id', async () => {
    const repository = createInMemoryNotificationsRepository({ deliveries: [delivery] })
    const notifier = { sendDirectMessage: vi.fn().mockResolvedValue({ providerMessageId: 'message-1' }) }
    await expect(processDiscordDeliveries({ repository, notifier, limit: 10 })).resolves.toBe(1)
    expect(notifier.sendDirectMessage).toHaveBeenCalledOnce()
    expect(repository.deliveries[0]).toMatchObject({ status: 'SENT', providerMessageId: 'message-1', attempts: 1 })
  })

  it('retries provider throttling and permanently fails after the attempt limit', async () => {
    const repository = createInMemoryNotificationsRepository({ deliveries: [
      { ...delivery, id: 'limited' },
      { ...delivery, id: 'invalid', attempts: 4 },
    ] })
    const notifier = { sendDirectMessage: vi.fn().mockRejectedValueOnce(new Error('DISCORD_RATE_LIMIT')).mockRejectedValueOnce(new Error('DISCORD_INVALID_RECIPIENT')) }
    await processDiscordDeliveries({ repository, notifier, now: () => new Date('2026-10-13T12:00:00Z'), limit: 10 })
    expect(repository.deliveries.find((item) => item.id === 'limited')).toMatchObject({ status: 'PENDING', lastErrorCode: 'DISCORD_RATE_LIMIT' })
    expect(repository.deliveries.find((item) => item.id === 'invalid')).toMatchObject({ status: 'FAILED', lastErrorCode: 'DISCORD_INVALID_RECIPIENT' })
  })

  it('creates a stable Discord-compatible idempotency nonce', () => {
    expect(createDeliveryIdempotencyKey('123e4567-e89b-12d3-a456-426614174000')).toMatch(/^[A-Za-z0-9_-]{1,25}$/)
    expect(createDeliveryIdempotencyKey('same-id')).toBe(createDeliveryIdempotencyKey('same-id'))
  })
})
