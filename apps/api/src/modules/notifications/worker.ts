import { createHash } from 'node:crypto'
import type { DiscordNotifier } from './discord-client.js'
import { MAX_NOTIFICATION_DELIVERY_ATTEMPTS, type NotificationRepository } from './repository.js'

const retryableCodes = new Set(['DISCORD_RATE_LIMIT', 'DISCORD_UNAVAILABLE'])
const knownDiscordCodes = new Set(['DISCORD_RATE_LIMIT', 'DISCORD_UNAVAILABLE', 'DISCORD_INVALID_RECIPIENT', 'DISCORD_INVALID_CONTENT', 'DISCORD_INVALID_IDEMPOTENCY_KEY'])

/** Discord limits message nonces to 25 characters; the digest stays stable across retries. */
export function createDeliveryIdempotencyKey(deliveryId: string): string {
  return createHash('sha256').update(deliveryId, 'utf8').digest('base64url').slice(0, 25)
}

const safeErrorCode = (error: unknown): string => error instanceof Error && knownDiscordCodes.has(error.message) ? error.message : 'DISCORD_UNAVAILABLE'

const nextRetryAt = (now: Date, attempts: number): Date => new Date(now.getTime() + Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1)))

export async function processDiscordDeliveries(input: { repository: NotificationRepository; notifier: DiscordNotifier; now?: () => Date; limit: number }): Promise<number> {
  const now = input.now ?? (() => new Date())
  const claimed = await input.repository.claimPendingDeliveries({ now: now(), limit: input.limit })
  for (const delivery of claimed) {
    try {
      const result = await input.notifier.sendDirectMessage({ recipientDiscordId: delivery.recipientDiscordId, content: delivery.content, idempotencyKey: createDeliveryIdempotencyKey(delivery.id) })
      await input.repository.markSent({ deliveryId: delivery.id, providerMessageId: result.providerMessageId, now: now() })
    } catch (error) {
      const errorCode = safeErrorCode(error)
      const current = now()
      if (retryableCodes.has(errorCode) && delivery.attempts < MAX_NOTIFICATION_DELIVERY_ATTEMPTS) {
        await input.repository.markRetryableFailure({ deliveryId: delivery.id, errorCode, nextAttemptAt: nextRetryAt(current, delivery.attempts), now: current })
      } else {
        await input.repository.markPermanentFailure({ deliveryId: delivery.id, errorCode, now: current })
      }
    }
  }
  return claimed.length
}

export function startNotificationWorker(input: { process: () => Promise<number>; intervalMs: number }): () => void {
  const timer = setInterval(() => {
    void input.process().catch(() => undefined)
  }, input.intervalMs)
  return () => clearInterval(timer)
}
