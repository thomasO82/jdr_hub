import type { GameMessageCreatedEvent, GameMessageEventBus, StreamMessageEvent } from '../../src/modules/messages/event-bus.js'

type Subscriber = {
  gameId: string
  signal: AbortSignal
  onEvent: (event: StreamMessageEvent) => Promise<void>
  resolve: () => void
  active: boolean
}

export function createInMemoryMessageEventBus(): GameMessageEventBus {
  const subscribers = new Set<Subscriber>()
  let sequence = 0

  return {
    async publish(event: GameMessageCreatedEvent) {
      const streamId = `${Date.now()}-${++sequence}`
      const deliveries = [...subscribers].filter((subscriber) => subscriber.active && subscriber.gameId === event.gameId)
      await Promise.all(deliveries.map(async (subscriber) => {
        if (!subscriber.signal.aborted) await subscriber.onEvent({ ...event, streamId })
      }))
    },

    subscribe({ gameId, signal, onEvent }) {
      return new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve()
          return
        }
        const subscriber: Subscriber = { gameId, signal, onEvent, resolve, active: true }
        const stop = () => {
          if (!subscriber.active) return
          subscriber.active = false
          subscribers.delete(subscriber)
          signal.removeEventListener('abort', stop)
          resolve()
        }
        signal.addEventListener('abort', stop, { once: true })
        subscribers.add(subscriber)
      })
    },
  }
}
