import { describe, expect, it } from 'vitest'
import { createGame } from '../../../src/modules/games/services/create-game.js'
import type { GamesRepository } from '../../../src/modules/games/repository.js'

describe('game services', () => {
  it('creates a game with an owner-derived slug and no client-owned fields', async () => {
    const calls: unknown[] = []
    const repository = { create: async (input: unknown) => { calls.push(input); return input as never } } as GamesRepository
    await createGame({ ownerId: 'owner-1', repository, game: {
      title: 'La Crypte Maudite', system: 'D&D', description: 'Desc', type: 'ONE_SHOT',
      maxPlayers: 4, visibility: 'PUBLIC', tags: ['horror'],
    } })
    expect(calls).toEqual([expect.objectContaining({ ownerId: 'owner-1', slug: 'la-crypte-maudite' })])
    expect(calls[0]).not.toHaveProperty('status')
  })
})
