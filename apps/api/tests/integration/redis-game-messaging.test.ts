import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { createRedisGameMessageEventBus } from '../../src/modules/messages/redis-event-bus.js'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) throw new Error('REDIS_URL is required for Redis integration tests')

const bus = createRedisGameMessageEventBus(redisUrl)

describe('Redis game message event bus', () => {
  it('relays only the target game and stops on abort', async () => {
    const gameId = `integration-${randomUUID()}`
    const controller = new AbortController()
    const events: Array<{ gameId: string; messageId: string }> = []
    const subscription = bus.subscribe({
      gameId,
      afterStreamId: '0-0',
      signal: controller.signal,
      onReady: async () => undefined,
      onEvent: async (event) => {
        events.push({ gameId: event.gameId, messageId: event.messageId })
        controller.abort()
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    await bus.publish({ gameId: `other-${gameId}`, messageId: 'other-message' })
    await bus.publish({ gameId, messageId: 'message-1' })
    await subscription
    await bus.publish({ gameId, messageId: 'message-2' })

    expect(events).toEqual([{ gameId, messageId: 'message-1' }])
  })

  it('does not miss an event published after the initial subscription becomes ready', async () => {
    const gameId = `readiness-${randomUUID()}`
    const controller = new AbortController()
    const events: string[] = []
    let ready = false
    const subscription = bus.subscribe({
      gameId,
      afterStreamId: null,
      signal: controller.signal,
      onReady: async () => { ready = true },
      onEvent: async (event) => {
        events.push(event.messageId)
        controller.abort()
      },
    })
    while (!ready) await new Promise((resolve) => setTimeout(resolve, 0))
    await bus.publish({ gameId, messageId: 'after-ready' })
    await subscription

    expect(events).toEqual(['after-ready'])
  })
})

afterAll(async () => {
  await bus.close?.()
})
