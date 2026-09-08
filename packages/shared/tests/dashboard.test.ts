import { describe, expect, it } from 'vitest'
import { dashboardBlockStateSchema, dashboardDataSchema } from '../src/dashboard.js'

describe('dashboard shared contracts', () => {
  it('accepts explicit rendered block states only', () => {
    expect(dashboardBlockStateSchema.safeParse('READY').success).toBe(true)
    expect(dashboardBlockStateSchema.safeParse('EMPTY').success).toBe(true)
    expect(dashboardBlockStateSchema.safeParse('ERROR').success).toBe(true)
    expect(dashboardBlockStateSchema.safeParse('LOADING').success).toBe(false)
  })

  it('accepts a dashboard whose notification block is absent when there are no unread notifications', () => {
    const result = dashboardDataSchema.parse({
      nextSession: { status: 'EMPTY', data: null },
      activeGames: { status: 'READY', data: [] },
      notifications: { status: 'EMPTY', data: null },
    })

    expect(result.notifications.status).toBe('EMPTY')
  })

  it('accepts only bounded unread notification summaries', () => {
    const result = dashboardDataSchema.parse({
      nextSession: { status: 'EMPTY', data: null },
      activeGames: { status: 'READY', data: [] },
      notifications: {
        status: 'READY',
        data: {
          unreadCount: 1,
          items: [{
            id: 'notification-1',
            type: 'ABSENCE_REPORTED',
            gameId: 'game-1',
            sessionId: 'session-1',
            title: 'Absence signalée',
            body: 'Un joueur a signalé son absence pour une séance.',
            readAt: null,
            createdAt: '2026-09-08T10:00:00.000Z',
          }],
        },
      },
    })

    expect(result.notifications.data?.items).toHaveLength(1)
    expect(result.notifications.data?.items[0]?.readAt).toBeNull()
  })

  it('rejects a dashboard notification containing a recipient or actor identifier', () => {
    expect(() => dashboardDataSchema.parse({
      nextSession: { status: 'EMPTY', data: null },
      activeGames: { status: 'READY', data: [] },
      notifications: { status: 'READY', data: { unreadCount: 1, items: [{ recipientId: 'private-user', actorId: 'private-user' }] } },
    })).toThrow()
  })
})
