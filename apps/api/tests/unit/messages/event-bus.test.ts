import { describe, expect, it } from 'vitest'
import { createInMemoryMessageEventBus } from '../../helpers/in-memory-message-event-bus.js'

describe('game message event bus', () => {
  it('signals readiness only after the subscriber can receive game events', async () => {
    const bus = createInMemoryMessageEventBus()
    const controller = new AbortController()
    const order: string[] = []
    const subscription = bus.subscribe({
      gameId: 'game-1',
      afterStreamId: null,
      signal: controller.signal,
      onReady: async () => { order.push('ready') },
      onEvent: async () => { order.push('message') },
    })

    await bus.publish({ gameId: 'game-1', messageId: 'message-1' })
    controller.abort()
    await subscription

    expect(order).toEqual(['ready', 'message'])
  })

  it('publishes only the requested game and stops after abort', async () => {
    const bus = createInMemoryMessageEventBus()
    const controller = new AbortController()
    const events: string[] = []
    const subscription = bus.subscribe({
      gameId: 'game-1',
      afterStreamId: null,
      signal: controller.signal,
      onReady: async () => undefined,
      onEvent: async (event) => { events.push(event.messageId) },
    })

    await bus.publish({ gameId: 'game-1', messageId: 'message-1' })
    await bus.publish({ gameId: 'game-2', messageId: 'message-2' })
    controller.abort()
    await subscription
    await bus.publish({ gameId: 'game-1', messageId: 'message-3' })

    expect(events).toEqual(['message-1'])
  })
})
