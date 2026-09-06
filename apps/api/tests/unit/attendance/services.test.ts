import { describe, expect, it } from 'vitest'
import { reportAbsence } from '../../../src/modules/attendance/services/report-absence.js'
import { validateAttendance } from '../../../src/modules/attendance/services/validate-attendance.js'
import { createInMemoryAttendanceRepository } from '../../helpers/in-memory-attendance-repository.js'

const session = {
  sessionId: 'session-1',
  gameId: 'game-1',
  gameTitle: 'Les Brumes de Valombre',
  sessionStartsAt: new Date('2026-09-10T18:00:00.000Z'),
  ownerId: 'gm-1',
  gameStatus: 'ACTIVE' as const,
  sessionStatus: 'SCHEDULED' as const,
}

describe('attendance services', () => {
  it('reports an absence as EXCUSED and creates only one local notification', async () => {
    const repository = createInMemoryAttendanceRepository({ sessions: [{ ...session, memberStatuses: { 'player-1': 'ACTIVE' } }] })
    const result = await reportAbsence({ sessionId: 'session-1', userId: 'player-1', repository, now: () => new Date('2026-09-06T12:00:00.000Z') })

    expect(result.attendance.status).toBe('EXCUSED')
    expect(result.notification).toMatchObject({ type: 'ABSENCE_REPORTED', recipientId: 'gm-1', actorId: 'player-1' })
    expect('delivery' in result).toBe(false)
    expect(repository.notifications).toHaveLength(1)
    expect(repository.deliveries).toHaveLength(0)
  })

  it('is idempotent for a repeated absence and never creates duplicate effects', async () => {
    const repository = createInMemoryAttendanceRepository({ sessions: [{ ...session, memberStatuses: { 'player-1': 'ACTIVE' } }] })
    const first = await reportAbsence({ sessionId: 'session-1', userId: 'player-1', repository })
    const second = await reportAbsence({ sessionId: 'session-1', userId: 'player-1', repository })

    expect(second).toEqual(first)
    expect(repository.notifications).toHaveLength(1)
    expect(repository.deliveries).toHaveLength(0)
  })

  it('rejects outsiders, inactive members and closed sessions without creating an event', async () => {
    const repository = createInMemoryAttendanceRepository({ sessions: [
      { ...session, memberStatuses: { 'player-1': 'LEFT' } },
      { ...session, sessionId: 'cancelled', sessionStatus: 'CANCELLED', memberStatuses: { 'player-1': 'ACTIVE' } },
      { ...session, sessionId: 'closed', gameStatus: 'CLOSED', memberStatuses: { 'player-1': 'ACTIVE' } },
    ] })

    await expect(reportAbsence({ sessionId: 'session-1', userId: 'outsider', repository })).rejects.toThrow('ATTENDANCE_FORBIDDEN')
    await expect(reportAbsence({ sessionId: 'session-1', userId: 'player-1', repository })).rejects.toThrow('ATTENDANCE_FORBIDDEN')
    await expect(reportAbsence({ sessionId: 'cancelled', userId: 'player-1', repository })).rejects.toThrow('ATTENDANCE_CONFLICT')
    await expect(reportAbsence({ sessionId: 'closed', userId: 'player-1', repository })).rejects.toThrow('ATTENDANCE_CONFLICT')
    expect(repository.notifications).toHaveLength(0)
  })

  it('lets only the owner finalize active members and closes the session atomically', async () => {
    const repository = createInMemoryAttendanceRepository({ sessions: [{ ...session, memberStatuses: { 'player-1': 'ACTIVE', 'player-2': 'ACTIVE' } }] })
    const result = await validateAttendance({
      sessionId: 'session-1',
      actorId: 'gm-1',
      entries: [
        { userId: 'player-1', status: 'PRESENT' },
        { userId: 'player-2', status: 'ABSENT' },
      ],
      repository,
    })

    expect(result.map((entry) => entry.status)).toEqual(['PRESENT', 'ABSENT'])
    expect(repository.sessionStatuses.get('session-1')).toBe('COMPLETED')
    await expect(validateAttendance({ sessionId: 'session-1', actorId: 'player-1', entries: [{ userId: 'player-1', status: 'PRESENT' }], repository })).rejects.toThrow('ATTENDANCE_FORBIDDEN')
  })

  it('replays an identical attendance validation after completion without changing the result', async () => {
    const repository = createInMemoryAttendanceRepository({ sessions: [{ ...session, memberStatuses: { 'player-1': 'ACTIVE' } }] })
    const command = [{ userId: 'player-1', status: 'PRESENT' as const }]

    const first = await validateAttendance({ sessionId: 'session-1', actorId: 'gm-1', entries: command, repository })
    const replay = await validateAttendance({ sessionId: 'session-1', actorId: 'gm-1', entries: command, repository })

    expect(replay).toEqual(first)
    await expect(validateAttendance({ sessionId: 'session-1', actorId: 'gm-1', entries: [{ userId: 'player-1', status: 'ABSENT' }], repository })).rejects.toThrow('ATTENDANCE_CONFLICT')
  })

  it('rejects a foreign attendance target and rolls back all changes', async () => {
    const repository = createInMemoryAttendanceRepository({ sessions: [{ ...session, memberStatuses: { 'player-1': 'ACTIVE' } }] })
    await expect(validateAttendance({ sessionId: 'session-1', actorId: 'gm-1', entries: [{ userId: 'outsider', status: 'ABSENT' }], repository })).rejects.toThrow('ATTENDANCE_FORBIDDEN')
    expect(repository.attendance).toHaveLength(0)
    expect(repository.sessionStatuses.get('session-1')).toBe('SCHEDULED')
  })
})
