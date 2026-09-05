import { describe, expect, it } from 'vitest'
import { createInMemoryApplicationsRepository } from '../../helpers/in-memory-applications-repository.js'

describe('applications repository invariants', () => {
  it('enforces one application per user and game and creates a roster member on acceptance', async () => {
    const repository = createInMemoryApplicationsRepository({
      games: [{ id: 'game-1', ownerId: 'gm-1', visibility: 'PUBLIC', status: 'OPEN', maxPlayers: 2 }],
    })
    const application = await repository.create({ gameId: 'game-1', userId: 'player-1', message: null })
    await expect(repository.create({ gameId: 'game-1', userId: 'player-1', message: null })).rejects.toThrow('APPLICATION_CONFLICT')
    await repository.decide(application.id, 'gm-1', 'ACCEPTED')
    expect(await repository.countActiveMembers('game-1')).toBe(1)
  })
})
