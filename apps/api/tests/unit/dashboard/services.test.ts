import { describe, expect, it } from 'vitest'
import { getDashboard } from '../../../src/modules/dashboard/services/get-dashboard.js'
import { getGameManagement } from '../../../src/modules/dashboard/services/get-game-management.js'
import { createInMemoryDashboardRepository } from '../../helpers/in-memory-dashboard-repository.js'

const userId = '00000000-0000-4000-8000-000000000001'
const gameId = '00000000-0000-4000-8000-000000000010'
const now = new Date('2026-09-06T12:00:00.000Z')

describe('dashboard projections', () => {
  it('builds player and GM blocks from explicit source projections', async () => {
    const dashboard = await getDashboard({ userId, repository: createInMemoryDashboardRepository({ populated: true }), now: () => now })
    expect(dashboard.user).toMatchObject({ id: userId, username: 'MJ' })
    expect(dashboard.nextSession.status).toBe('READY')
    expect(dashboard.activeGames.data?.[0]).toMatchObject({ id: gameId, role: 'GM', activePlayers: 2 })
    expect(dashboard.applications.data).toEqual({ pending: 1, accepted: 2, rejected: 0 })
    expect(dashboard.invitations.data).toEqual({ receivedPending: 1, sentPending: 2 })
    expect(dashboard.progression.status).toBe('EMPTY')
  })

  it('represents an empty dashboard without fake private or progression data', async () => {
    const dashboard = await getDashboard({ userId, repository: createInMemoryDashboardRepository(), now: () => now })
    expect(dashboard.nextSession).toMatchObject({ status: 'EMPTY', data: null, error: null })
    expect(dashboard.activeGames).toMatchObject({ status: 'EMPTY', data: null, error: null })
    expect(dashboard.applications).toMatchObject({ status: 'EMPTY', data: null, error: null })
    expect(dashboard.invitations).toMatchObject({ status: 'EMPTY', data: null, error: null })
    expect(dashboard.schedulingActions).toMatchObject({ status: 'EMPTY', data: null, error: null })
    expect(dashboard.attendanceActions).toMatchObject({ status: 'EMPTY', data: null, error: null })
    expect(JSON.stringify(dashboard)).not.toContain('discord')
  })

  it('keeps independent blocks available when one source fails', async () => {
    const dashboard = await getDashboard({ userId, repository: createInMemoryDashboardRepository({ populated: true, fail: ['invitations'] }), now: () => now })
    expect(dashboard.nextSession.status).toBe('READY')
    expect(dashboard.activeGames.status).toBe('READY')
    expect(dashboard.invitations).toMatchObject({ status: 'ERROR', data: null, error: { code: 'DASHBOARD_SOURCE_ERROR' } })
    expect(dashboard.invitations.error?.message).toContain('Réessayez')
    expect(dashboard.invitations.error?.message).not.toContain('database')
  })

  it('returns management only for the game owner and keeps the roster projection explicit', async () => {
    const repository = createInMemoryDashboardRepository({ populated: true })
    const management = await getGameManagement({ userId, gameId, repository, now: () => now })
    expect(management.game).toMatchObject({ id: gameId, role: 'GM' })
    expect(management.members[0]).toMatchObject({ userId, role: 'GM', status: 'ACTIVE' })
    expect(management.applications[0]).not.toHaveProperty('avatarUrl')
    await expect(getGameManagement({ userId: '00000000-0000-4000-8000-000000000099', gameId, repository, now: () => now })).rejects.toThrow('DASHBOARD_NOT_FOUND')
  })
})
