import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import { gameMessageCommandSchema, gameMessageQuerySchema } from '@jdr-hub/shared'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { GameMessageEventBus } from './event-bus.js'
import type { GameMessageRepository, MessageRecord } from './repository.js'
import { createMessage } from './services/create-message.js'
import { listMessages } from './services/list-messages.js'

export type MessagesDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: GameMessageRepository
  eventBus: GameMessageEventBus
  now?: () => Date
}

export type MessagesRouteEnv = { Variables: { requestId: string } }

const STREAM_ID_PATTERN = /^\d+-\d+$/

function error(c: Context<MessagesRouteEnv>, status: 400 | 401 | 403 | 404 | 429 | 500) {
  const message = status === 500 ? 'Une erreur interne est survenue. Réessayez plus tard.' : 'La conversation n’a pas pu être traitée.'
  return c.json({ data: null, error: { code: status === 500 ? 'INTERNAL_ERROR' : 'MESSAGE_ERROR', message }, meta: { requestId: c.get('requestId') } }, status)
}

function domainStatus(value: unknown): 400 | 403 | 404 | 500 {
  if (!(value instanceof Error)) return 500
  if (value.message === 'MESSAGE_INVALID' || value.message === 'MESSAGE_INVALID_CURSOR' || value.message === 'MESSAGE_INVALID_STREAM_ID') return 400
  if (value.message === 'MESSAGE_FORBIDDEN') return 403
  if (value.message === 'MESSAGE_NOT_FOUND') return 404
  return 500
}

const serializeMessage = (message: MessageRecord) => ({
  id: message.id,
  author: { name: message.authorName, avatarUrl: message.authorAvatarUrl },
  content: message.content,
  createdAt: message.createdAt.toISOString(),
})

export function createMessageHandlers(dependencies: MessagesDependencies) {
  const now = dependencies.now ?? (() => new Date())
  const writeLimits = new Map<string, { startedAt: number; count: number }>()
  const streamCounts = new Map<string, number>()
  const allowedWrite = (userId: string): boolean => {
    const currentTime = Date.now()
    const current = writeLimits.get(userId)
    if (!current || currentTime - current.startedAt >= 60_000) {
      writeLimits.set(userId, { startedAt: currentTime, count: 1 })
      return true
    }
    if (current.count >= 30) return false
    current.count += 1
    return true
  }

  async function currentUser(c: Context<MessagesRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }

  const trustedOrigin = (c: Context<MessagesRouteEnv>): boolean => c.req.header('origin') === dependencies.authConfig.appOrigin

  return {
    list: async (c: Context<MessagesRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const gameIdOrSlug = c.req.param('gameId')
      const parsed = gameMessageQuerySchema.safeParse(c.req.query())
      if (!gameIdOrSlug || !parsed.success) return error(c, 400)
      try {
        const data = await listMessages({ gameIdOrSlug, userId: user.id, cursor: parsed.data.cursor ?? null, limit: parsed.data.limit, repository: dependencies.repository })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) { return error(c, domainStatus(value)) }
    },

    create: async (c: Context<MessagesRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowedWrite(user.id)) return error(c, 429)
      const gameIdOrSlug = c.req.param('gameId')
      const parsed = gameMessageCommandSchema.safeParse(await c.req.json().catch(() => null))
      if (!gameIdOrSlug || !parsed.success) return error(c, 400)
      try {
        const message = await createMessage({ gameIdOrSlug, userId: user.id, content: parsed.data.content, repository: dependencies.repository, now: now() })
        try {
          await dependencies.eventBus.publish({ gameId: message.gameId, messageId: message.id })
        } catch {
          // PostgreSQL is authoritative; a Redis outage must not report a durable write as failed.
        }
        return c.json({ data: serializeMessage(message), error: null, meta: { requestId: c.get('requestId') } }, 201)
      } catch (value) { return error(c, domainStatus(value)) }
    },

    stream: async (c: Context<MessagesRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const gameIdOrSlug = c.req.param('gameId')
      const lastEventId = c.req.header('last-event-id') ?? null
      if (!gameIdOrSlug || (lastEventId && !STREAM_ID_PATTERN.test(lastEventId))) return error(c, 400)
      const access = await dependencies.repository.getAccess({ gameIdOrSlug, userId: user.id })
      if (!access?.canRead) return error(c, 403)
      const connectionKey = `${user.id}:${access.gameId}`
      const currentConnections = streamCounts.get(connectionKey) ?? 0
      if (currentConnections >= 5) return error(c, 429)
      streamCounts.set(connectionKey, currentConnections + 1)

      return streamSSE(c, async (stream) => {
        const controller = new AbortController()
        let heartbeat: ReturnType<typeof setInterval> | undefined
        let released = false
        const release = () => {
          if (released) return
          released = true
          controller.abort()
          const count = streamCounts.get(connectionKey) ?? 1
          if (count <= 1) streamCounts.delete(connectionKey)
          else streamCounts.set(connectionKey, count - 1)
        }
        stream.onAbort(release)
        const revalidate = async (): Promise<boolean> => {
          const currentAccess = await dependencies.repository.getAccess({ gameIdOrSlug, userId: user.id })
          if (currentAccess?.canRead !== true || currentAccess.gameId !== access.gameId) {
            controller.abort()
            stream.abort()
            return false
          }
          return true
        }
        const sendHeartbeat = async () => {
          if (!(await revalidate()) || controller.signal.aborted) return
          await stream.writeSSE({ event: 'heartbeat', data: '{}' })
        }
        heartbeat = setInterval(() => { void sendHeartbeat().catch(() => { controller.abort(); stream.abort() }) }, 15_000)
        try {
          await dependencies.eventBus.subscribe({
            gameId: access.gameId,
            afterStreamId: lastEventId,
            signal: controller.signal,
            onEvent: async (event) => {
              if (!(await revalidate()) || event.gameId !== access.gameId) return
              const message = await dependencies.repository.findById({ gameId: access.gameId, messageId: event.messageId })
              if (!message) return
              await stream.writeSSE({ event: 'message', id: event.streamId, data: JSON.stringify(serializeMessage(message)) })
            },
          })
        } finally {
          if (heartbeat) clearInterval(heartbeat)
          release()
          if (!stream.closed) await stream.close()
        }
      }, async (_value, stream) => {
        stream.abort()
      })
    },
  }
}
