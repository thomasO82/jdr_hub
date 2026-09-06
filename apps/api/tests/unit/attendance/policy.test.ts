import { describe, expect, it } from 'vitest'
import { canReportAbsence, canValidateAttendance } from '../../../src/modules/attendance/policy.js'

describe('attendance policy', () => {
  it('allows an active member to report once before a scheduled session', () => {
    expect(canReportAbsence({ sessionStatus: 'SCHEDULED', gameStatus: 'ACTIVE', memberStatus: 'ACTIVE', attendanceStatus: null })).toBe(true)
    expect(canReportAbsence({ sessionStatus: 'SCHEDULED', gameStatus: 'ACTIVE', memberStatus: 'ACTIVE', attendanceStatus: 'PENDING' })).toBe(true)
  })

  it('rejects absence reports from inactive members or terminal sessions', () => {
    expect(canReportAbsence({ sessionStatus: 'SCHEDULED', gameStatus: 'ACTIVE', memberStatus: 'LEFT', attendanceStatus: null })).toBe(false)
    expect(canReportAbsence({ sessionStatus: 'COMPLETED', gameStatus: 'ACTIVE', memberStatus: 'ACTIVE', attendanceStatus: null })).toBe(false)
    expect(canReportAbsence({ sessionStatus: 'CANCELLED', gameStatus: 'ACTIVE', memberStatus: 'ACTIVE', attendanceStatus: null })).toBe(false)
    expect(canReportAbsence({ sessionStatus: 'SCHEDULED', gameStatus: 'CLOSED', memberStatus: 'ACTIVE', attendanceStatus: null })).toBe(false)
    expect(canReportAbsence({ sessionStatus: 'SCHEDULED', gameStatus: 'ACTIVE', memberStatus: 'ACTIVE', attendanceStatus: 'EXCUSED' })).toBe(false)
  })

  it('allows only the game owner to validate an unfinished session', () => {
    expect(canValidateAttendance({ sessionStatus: 'SCHEDULED', gameStatus: 'ACTIVE', ownerId: 'owner-1', actorId: 'owner-1' })).toBe(true)
    expect(canValidateAttendance({ sessionStatus: 'SCHEDULED', gameStatus: 'ACTIVE', ownerId: 'owner-1', actorId: 'player-1' })).toBe(false)
    expect(canValidateAttendance({ sessionStatus: 'COMPLETED', gameStatus: 'ACTIVE', ownerId: 'owner-1', actorId: 'owner-1' })).toBe(false)
    expect(canValidateAttendance({ sessionStatus: 'SCHEDULED', gameStatus: 'CLOSED', ownerId: 'owner-1', actorId: 'owner-1' })).toBe(false)
  })
})
