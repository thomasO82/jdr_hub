import { createClient } from 'redis'
import type { GameMessageEventBus, GameMessageCreatedEvent, StreamMessageEvent } from './event-bus.js'

const STREAM_MAX_LENGTH = 10_000
const STREAM_ID_PATTERN = /^\d+-\d+$/

const streamKey = (gameId: string): string => `game-messages:${gameId}`

function assertStreamId(streamId: string): void {
  if (!STREAM_ID_PATTERN.test(streamId)) throw new Error('MESSAGE_INVALID_STREAM_ID')
}

export function createRedisGameMessageEventBus(redisUrl: string): GameMessageEventBus {
  const publisher = createClient({ url: redisUrl, RESP: 2 })
  publisher.on('error', () => undefined)
  let publisherConnection: Promise<void> | null = null

  const ensurePublisher = async () => {
    publisherConnection ??= publisher.connect().then(() => undefined)
    await publisherConnection
    return publisher
  }

  return {
    async publish(event: GameMessageCreatedEvent) {
      const client = await ensurePublisher()
      await client.xAdd(streamKey(event.gameId), '*', {
        game_id: event.gameId,
        message_id: event.messageId,
      }, {
        TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: STREAM_MAX_LENGTH },
      })
    },

    async subscribe({ gameId, afterStreamId, signal, onEvent }) {
      if (afterStreamId) assertStreamId(afterStreamId)
      if (signal.aborted) return
      const reader = (await ensurePublisher()).duplicate()
      reader.on('error', () => undefined)
      await reader.connect()
      let cursor = afterStreamId ?? '$'
      try {
        while (!signal.aborted) {
          const response = await reader.withAbortSignal(signal).xRead(
            [{ key: streamKey(gameId), id: cursor }],
            { BLOCK: 5_000, COUNT: 20 },
          )
          if (!response) continue
          for (const stream of response) {
            for (const message of stream.messages) {
              cursor = message.id
              const event = readStreamEvent(message.id, message.message)
              if (event) await onEvent(event)
            }
          }
        }
      } catch (error) {
        if (!signal.aborted) throw error
      } finally {
        reader.destroy()
      }
    },
  }
}

function readStreamEvent(streamId: string, fields: Record<string, string>): StreamMessageEvent | null {
  assertStreamId(streamId)
  const gameId = fields.game_id
  const messageId = fields.message_id
  if (!gameId || !messageId) return null
  return { gameId, messageId, streamId }
}
