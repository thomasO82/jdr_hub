import { describe, expect, it, vi } from 'vitest'
import { createDashboardApi } from '../lib/dashboard-api.js'

const dashboard = { user: { id: 'user-1', username: 'MJ', avatarUrl: null }, nextSession: { status: 'EMPTY', data: null, error: null }, activeGames: { status: 'EMPTY', data: null, error: null }, applications: { status: 'EMPTY', data: null, error: null }, invitations: { status: 'EMPTY', data: null, error: null }, schedulingActions: { status: 'EMPTY', data: null, error: null }, attendanceActions: { status: 'EMPTY', data: null, error: null }, progression: { status: 'EMPTY', data: null, error: null } } as const

describe('dashboard API client', () => {
  it('loads dashboard and management projections with credentials and no cache', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: dashboard }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: dashboard }), { status: 200 }))
    const api = createDashboardApi({ baseUrl: 'http://api.test/api', fetcher })
    await expect(api.getDashboard()).resolves.toEqual(dashboard)
    await expect(api.getManagement('game/1')).resolves.toEqual(dashboard)
    expect(fetcher).toHaveBeenNthCalledWith(1, 'http://api.test/api/dashboard', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
    expect(fetcher).toHaveBeenNthCalledWith(2, 'http://api.test/api/games/game%2F1/manage', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
  })

  it('turns transport and invalid envelope failures into a safe null result', async () => {
    const api = createDashboardApi({ fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response('database password', { status: 500 })) })
    await expect(api.getDashboard()).resolves.toBeNull()
    expect(JSON.stringify(await api.getDashboard())).not.toContain('password')
  })
})
