import { describe, expect, it } from 'vitest'
import { createMessage } from '../../../src/modules/messages/services/create-message.js'
import { listMessages } from '../../../src/modules/messages/services/list-messages.js'
import { createInMemoryMessagesRepository } from '../../helpers/in-memory-messages-repository.js'

const now = new Date('2026-09-06T12:00:00.000Z')

describe('game message services', () => {
  it('lists a stable first page and continues from its opaque cursor', async () => {
    const repository = createInMemoryMessagesRepository({
      games: [{ id: 'game-1', slug: 'brumes', status: 'ACTIVE', ownerId: 'owner-1', members: { 'player-1': 'ACTIVE' } }],
      messages: [
        { id: 'message-1', gameId: 'game-1', authorId: 'player-1', authorName: 'Joueur', authorAvatarUrl: null, content: 'Un', createdAt: new Date('2026-09-06T12:00:00.000Z') },
        { id: 'message-2', gameId: 'game-1', authorId: 'owner-1', authorName: 'MJ', authorAvatarUrl: null, content: 'Deux', createdAt: new Date('2026-09-06T12:01:00.000Z') },
        { id: 'message-3', gameId: 'game-1', authorId: 'player-1', authorName: 'Joueur', authorAvatarUrl: null, content: 'Trois', createdAt: new Date('2026-09-06T12:02:00.000Z') },
      ],
    })

    const first = await listMessages({ gameIdOrSlug: 'brumes', userId: 'player-1', cursor: null, limit: 2, repository })
    const second = await listMessages({ gameIdOrSlug: 'brumes', userId: 'player-1', cursor: first.nextCursor, limit: 2, repository })

    expect(first.items.map((message) => message.id)).toEqual(['message-3', 'message-2'])
    expect(first.nextCursor).toBeTypeOf('string')
    expect(first.canWrite).toBe(true)
    expect(second.items.map((message) => message.id)).toEqual(['message-1'])
    expect(second.nextCursor).toBeNull()
  })

  it('allows the owner to create a message without a membership row', async () => {
    const repository = createInMemoryMessagesRepository({
      games: [{ id: 'game-1', slug: 'brumes', status: 'OPEN', ownerId: 'owner-1', members: {} }],
    })

    const message = await createMessage({ gameIdOrSlug: 'brumes', userId: 'owner-1', content: '  Message du MJ  ', repository, now })

    expect(message.authorId).toBe('owner-1')
    expect(message.content).toBe('Message du MJ')
    expect(message.authorName).toBe('owner-1')
  })

  it('allows an active member to create a message and never accepts a client author', async () => {
    const repository = createInMemoryMessagesRepository({
      games: [{ id: 'game-1', slug: 'brumes', status: 'ACTIVE', ownerId: 'owner-1', members: { 'player-1': 'ACTIVE' } }],
    })

    const message = await createMessage({ gameIdOrSlug: 'brumes', userId: 'player-1', content: 'Salut', repository, now })

    expect(message.authorId).toBe('player-1')
    expect(repository.messages).toHaveLength(1)
  })

  it('rejects writes to closed games', async () => {
    const repository = createInMemoryMessagesRepository({
      games: [{ id: 'game-1', slug: 'brumes', status: 'CLOSED', ownerId: 'owner-1', members: { 'player-1': 'ACTIVE' } }],
    })

    await expect(createMessage({ gameIdOrSlug: 'brumes', userId: 'player-1', content: 'Trop tard', repository, now })).rejects.toThrow('MESSAGE_FORBIDDEN')
    expect(repository.messages).toHaveLength(0)
  })
})
