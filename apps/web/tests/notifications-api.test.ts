import { describe, expect, it, vi } from 'vitest'
import { createNotificationsApi } from '../lib/notifications-api.js'

const page = {
  items: [{ id: 'notification-1', type: 'ABSENCE_REPORTED' as const, recipientId: 'gm-1', gameId: 'game-1', sessionId: 'session-1', actorId: 'player-1', title: 'Absence signalée', body: 'Un joueur a signalé son absence pour une séance.', readAt: null, createdAt: '2026-09-06T12:00:00.000Z' }],
  nextCursor: null,
  unreadCount: 1,
}

describe('notifications API client', () => {
  it('loads notifications with credentials and bounded pagination', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: page }), { status: 200 }))
    const api = createNotificationsApi({ baseUrl: 'http://localhost:8787/api', fetcher })

    await expect(api.getNotifications({ limit: 20 })).resolves.toEqual(page)
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/notifications?limit=20', expect.objectContaining({ credentials: 'include' }))
  })

  it('marks a notification read with the trusted origin and no user-controlled payload', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const api = createNotificationsApi({ baseUrl: 'http://localhost:8787/api', origin: 'http://localhost:8787', fetcher })

    await expect(api.markNotificationRead('notification-1')).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/notifications/notification-1/read', expect.objectContaining({ method: 'POST', credentials: 'include', headers: expect.objectContaining({ origin: 'http://localhost:8787' }), body: '{}' }))
  })

  it('translates transport failures into a French actionable error', async () => {
    const api = createNotificationsApi({ fetcher: vi.fn().mockRejectedValue(new Error('raw provider details')) })
    await expect(api.getNotifications()).rejects.toThrow('Les notifications sont momentanément indisponibles. Réessayez.')
  })
})
