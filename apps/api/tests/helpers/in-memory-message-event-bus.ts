import type { GameMessageCreatedEvent, GameMessageEventBus, StreamMessageEvent } from '../../src/modules/messages/event-bus.js'

type Subscriber = {
  gameId: string
  signal: AbortSignal
  onReady: () => Promise<void>
  onEvent: (event: StreamMessageEvent) => Promise<void>
  pending: StreamMessageEvent[]
  ready: boolean
  dispatching: boolean
  resolve: () => void
  active: boolean
}

async function drainSubscriber(subscriber: Subscriber): Promise<void> {
  if (!subscriber.ready || subscriber.dispatching || !subscriber.active) return
  subscriber.dispatching = true
  try {
    while (subscriber.active && !subscriber.signal.aborted && subscriber.pending.length > 0) {
      await subscriber.onEvent(subscriber.pending.shift()!)
    }
  } finally {
    subscriber.dispatching = false
  }
}

export function createInMemoryMessageEventBus(): GameMessageEventBus {
  const subscribers = new Set<Subscriber>()
  let sequence = 0

  return {
    async publish(event: GameMessageCreatedEvent) {
      const streamId = `${Date.now()}-${++sequence}`
      const deliveries = [...subscribers].filter((subscriber) => subscriber.active && subscriber.gameId === event.gameId)
      await Promise.all(deliveries.map(async (subscriber) => {
        if (subscriber.signal.aborted) return
        subscriber.pending.push({ ...event, streamId })
        await drainSubscriber(subscriber)
      }))
    },

    subscribe({ gameId, signal, onReady, onEvent }) {
      return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          resolve()
          return
        }
        const subscriber: Subscriber = { gameId, signal, onReady, onEvent, pending: [], ready: false, dispatching: false, resolve, active: true }
        const stop = () => {
          if (!subscriber.active) return
          subscriber.active = false
          subscribers.delete(subscriber)
          signal.removeEventListener('abort', stop)
          resolve()
        }
        signal.addEventListener('abort', stop, { once: true })
        subscribers.add(subscriber)
        void onReady().then(async () => {
          if (!subscriber.active) return
          subscriber.ready = true
          await drainSubscriber(subscriber)
        }).catch((error: unknown) => {
          stop()
          reject(error)
        })
      })
    },
  }
}
