import { describe, expect, it } from 'vitest'
import { createGame } from '../../../src/modules/games/services/create-game.js'
import { updateGame } from '../../../src/modules/games/services/update-game.js'
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

  it('rejects an invalid lifecycle transition', async () => {
    const repository = {
      findById: async () => ({ id: 'g', ownerId: 'owner-1', status: 'COMPLETED', type: 'CAMPAIGN', visibility: 'PUBLIC', title: 'x', slug: 'x', system: 'x', description: 'x', maxPlayers: 1, tags: [] }),
      update: async () => null,
    } as unknown as GamesRepository
    await expect(updateGame({ id: 'g', ownerId: 'owner-1', game: { status: 'OPEN' }, repository })).rejects.toThrow('GAME_STATUS_TRANSITION_INVALID')
  })
})
