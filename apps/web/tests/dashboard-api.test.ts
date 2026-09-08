import { describe, expect, it, vi } from 'vitest'
import type { DashboardData } from '@jdr-hub/shared'
import { createDashboardApi } from '../lib/dashboard-api.js'

const dashboardData: DashboardData = {
  nextSession: { status: 'EMPTY', data: null },
  activeGames: { status: 'READY', data: [] },
  notifications: { status: 'EMPTY', data: null },
}

describe('dashboard API client', () => {
  it('loads the dashboard with session credentials and no user-controlled identity', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: dashboardData, error: null }), { status: 200 }))

    await expect(createDashboardApi({ baseUrl: 'http://localhost:8787/api', fetcher }).get()).resolves.toEqual(dashboardData)
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/dashboard', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
  })

  it('maps transport failures to a safe empty response', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('raw backend failure'))

    await expect(createDashboardApi({ fetcher }).get()).resolves.toBeNull()
  })
})
