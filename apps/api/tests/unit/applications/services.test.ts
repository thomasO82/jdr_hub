import { describe, expect, it } from 'vitest'
import { createInMemoryApplicationsRepository } from '../../helpers/in-memory-applications-repository.js'
import { decideApplication } from '../../../src/modules/applications/services/decide-application.js'
import { submitApplication } from '../../../src/modules/applications/services/submit-application.js'

const baseGame = { id: 'game-1', ownerId: 'gm-1', visibility: 'PUBLIC' as const, status: 'OPEN' as const, maxPlayers: 2 }

describe('application services', () => {
  it('creates a pending application for an eligible game', async () => {
    const repository = createInMemoryApplicationsRepository({ games: [baseGame] })
    const application = await submitApplication({ userId: 'player-1', gameId: 'game-1', message: 'Je suis disponible le jeudi.', repository })
    expect(application).toMatchObject({ gameId: 'game-1', userId: 'player-1', message: 'Je suis disponible le jeudi.', status: 'PENDING' })
  })

  it('rejects self-application, hidden games and duplicate applications', async () => {
    const repository = createInMemoryApplicationsRepository({ games: [baseGame, { ...baseGame, id: 'private', visibility: 'PRIVATE' }, { ...baseGame, id: 'closed', status: 'CLOSED' }] })
    await expect(submitApplication({ userId: 'gm-1', gameId: 'game-1', repository })).rejects.toThrow('APPLICATION_CONFLICT')
    await expect(submitApplication({ userId: 'player-1', gameId: 'private', repository })).rejects.toThrow('APPLICATION_NOT_FOUND')
    await expect(submitApplication({ userId: 'player-1', gameId: 'closed', repository })).rejects.toThrow('APPLICATION_NOT_FOUND')
    await submitApplication({ userId: 'player-1', gameId: 'game-1', repository })
    await expect(submitApplication({ userId: 'player-1', gameId: 'game-1', repository })).rejects.toThrow('APPLICATION_CONFLICT')
  })

  it('accepts once and refuses a candidate when capacity is reached', async () => {
    const repository = createInMemoryApplicationsRepository({ games: [{ ...baseGame, maxPlayers: 1 }], applications: [{ id: 'application-1', gameId: 'game-1', userId: 'player-1', message: null, status: 'PENDING' }] })
    await decideApplication({ applicationId: 'application-1', ownerId: 'gm-1', status: 'ACCEPTED', repository })
    await expect(decideApplication({ applicationId: 'application-1', ownerId: 'gm-1', status: 'REJECTED', repository })).rejects.toThrow('APPLICATION_CONFLICT')
    const second = await repository.create({ gameId: 'game-1', userId: 'player-2', message: null })
    await expect(decideApplication({ applicationId: second.id, ownerId: 'gm-1', status: 'ACCEPTED', repository })).rejects.toThrow('APPLICATION_CONFLICT')
  })
})
