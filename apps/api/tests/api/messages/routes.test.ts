import { describe, expect, it } from 'vitest'
import type { GameStatus } from '@jdr-hub/shared'
import { createApiApp } from '../../../src/app.js'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { createInMemoryMessageEventBus } from '../../helpers/in-memory-message-event-bus.js'
import type { GameMessageEventBus } from '../../../src/modules/messages/event-bus.js'
import { createInMemoryMessagesRepository } from '../../helpers/in-memory-messages-repository.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'

const config = parseAuthConfig({ APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678', DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback', JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })
const now = new Date()

async function createTestApp(input: { gameStatus?: GameStatus; eventBus?: GameMessageEventBus } = {}) {
  const authRepository = createInMemoryAuthRepository()
  const [owner, member, removed] = await Promise.all([
    authRepository.upsertDiscordUser({ discordId: 'discord-owner', username: 'MJ', avatarUrl: null }, now),
    authRepository.upsertDiscordUser({ discordId: 'discord-member', username: 'Joueur', avatarUrl: null }, now),
    authRepository.upsertDiscordUser({ discordId: 'discord-removed', username: 'Ancien', avatarUrl: null }, now),
  ])
  const credentials = await Promise.all([owner, member, removed].map(async (user, index) => {
    const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(index + 1) })
    await authRepository.createSession(user.id, credential)
    const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
    return { user, cookie: `jdr_hub_access=${token}` }
  }))
  const repository = createInMemoryMessagesRepository({
    games: [{ id: 'game-1', slug: 'brumes', status: input.gameStatus ?? 'ACTIVE', ownerId: owner.id, members: { [member.id]: 'ACTIVE', [removed.id]: 'REMOVED' } }],
    authors: { [owner.id]: { name: owner.username, avatarUrl: owner.avatarUrl }, [member.id]: { name: member.username, avatarUrl: member.avatarUrl }, [removed.id]: { name: removed.username, avatarUrl: removed.avatarUrl } },
  })
  const eventBus = input.eventBus ?? createInMemoryMessageEventBus()
  const app = createApiApp({
    auth: { config, repository: authRepository },
    messages: { authConfig: config, authRepository, repository, eventBus, now: () => now },
  })
  return { app, owner: credentials[0]!, member: credentials[1]!, removed: credentials[2]!, repository, eventBus }
}

const jsonHeaders = (cookie: string) => ({ cookie, origin: config.appOrigin, 'content-type': 'application/json' })

describe('game messaging API routes', () => {
  it('requires authentication for message history and writes', async () => {
    const { app } = await createTestApp()
    expect((await app.request('/games/brumes/messages')).status).toBe(401)
    expect((await app.request('/games/brumes/messages', { method: 'POST', headers: { origin: config.appOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ content: 'Salut' }) })).status).toBe(401)
  })

  it('allows an active member to read and write trimmed text with a strict payload', async () => {
    const { app, member } = await createTestApp()
    const invalid = await app.request('/games/brumes/messages', { method: 'POST', headers: jsonHeaders(member.cookie), body: JSON.stringify({ content: 'Salut', authorId: 'forged' }) })
    expect(invalid.status).toBe(400)
    const response = await app.request('/games/brumes/messages', { method: 'POST', headers: jsonHeaders(member.cookie), body: JSON.stringify({ content: '  On joue jeudi.  ' }) })
    expect(response.status).toBe(201)
    expect((await response.json()).data).toMatchObject({ content: 'On joue jeudi.', author: { name: 'Joueur' } })
  })

  it('requires the trusted origin for writes and denies removed members', async () => {
    const { app, member, removed } = await createTestApp()
    const untrusted = await app.request('/games/brumes/messages', { method: 'POST', headers: { cookie: member.cookie, 'content-type': 'application/json', origin: 'https://attacker.example.test' }, body: JSON.stringify({ content: 'Non' }) })
    expect(untrusted.status).toBe(403)
    expect((await app.request('/games/brumes/messages', { headers: { cookie: removed.cookie } })).status).toBe(403)
  })

  it('returns a read-only page for a closed game', async () => {
    const { app, owner } = await createTestApp({ gameStatus: 'CLOSED' })
    const response = await app.request('/games/brumes/messages', { headers: { cookie: owner.cookie } })
    expect(response.status).toBe(200)
    expect((await response.json()).data.canWrite).toBe(false)
    const write = await app.request('/games/brumes/messages', { method: 'POST', headers: jsonHeaders(owner.cookie), body: JSON.stringify({ content: 'Interdit' }) })
    expect(write.status).toBe(403)
  })

  it('returns 201 after durable persistence when event publication fails', async () => {
    const eventBus: GameMessageEventBus = {
      async publish() { throw new Error('redis unavailable') },
      async subscribe() {},
    }
    const { app, member, repository } = await createTestApp({ eventBus })
    const response = await app.request('/games/brumes/messages', { method: 'POST', headers: jsonHeaders(member.cookie), body: JSON.stringify({ content: 'Persisté' }) })
    expect(response.status).toBe(201)
    expect(repository.messages).toHaveLength(1)
  })

  it('returns a generic error when message persistence fails', async () => {
    const { app, member, repository } = await createTestApp()
    repository.create = async () => { throw new Error('database password') }
    const response = await app.request('/games/brumes/messages', { method: 'POST', headers: jsonHeaders(member.cookie), body: JSON.stringify({ content: 'Échec' }) })
    const payload = await response.json()
    expect(response.status).toBe(500)
    expect(payload).toMatchObject({ error: { message: expect.stringContaining('Réessayez') } })
    expect(JSON.stringify(payload)).not.toContain('password')
  })

  it('limits writes to thirty requests per minute', async () => {
    const { app, member } = await createTestApp()
    const requests = await Promise.all(Array.from({ length: 31 }, () => app.request('/games/brumes/messages', { method: 'POST', headers: jsonHeaders(member.cookie), body: JSON.stringify({ content: 'Spam' }) })))
    expect(requests.filter((response) => response.status === 429)).toHaveLength(1)
  })

  it('exposes a credentialed SSE stream without leaking Discord identifiers', async () => {
    const { app, member, repository, eventBus } = await createTestApp()
    const message = await repository.create({ gameIdOrSlug: 'brumes', authorId: member.user.id, content: 'Temps réel', now })
    const response = await app.request('/games/brumes/messages/stream', { headers: { cookie: member.cookie } })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(response.headers.get('cache-control')).toContain('no-cache')
    const reader = response.body!.getReader()
    const chunkPromise = reader.read()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await eventBus.publish({ gameId: 'game-1', messageId: message.id })
    const chunk = await chunkPromise
    expect(new TextDecoder().decode(chunk.value)).toContain('event: message')
    expect(new TextDecoder().decode(chunk.value)).toContain('Temps réel')
    expect(new TextDecoder().decode(chunk.value)).not.toContain('discord')
    await reader.cancel()
  })
})
