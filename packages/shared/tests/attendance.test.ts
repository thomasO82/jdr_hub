import { describe, expect, it } from 'vitest'
import {
  absenceCommandSchema,
  attendanceCommandSchema,
  attendanceStatusSchema,
  notificationChannelSchema,
  notificationQuerySchema,
  notificationTypeSchema,
} from '../src/attendance.js'

describe('attendance and notification shared contracts', () => {
  it('accepts supported attendance statuses and notification values', () => {
    expect(attendanceStatusSchema.parse('EXCUSED')).toBe('EXCUSED')
    expect(notificationTypeSchema.parse('ABSENCE_REPORTED')).toBe('ABSENCE_REPORTED')
    expect(notificationChannelSchema.parse('DISCORD_DM')).toBe('DISCORD_DM')
  })

  it('accepts a strict absence command and rejects a client-provided reason', () => {
    expect(absenceCommandSchema.parse({})).toEqual({})
    expect(absenceCommandSchema.safeParse({ reason: 'texte' }).success).toBe(false)
  })

  it('bounds and validates attendance updates', () => {
    expect(attendanceCommandSchema.parse({ entries: [{ userId: '11111111-1111-4111-8111-111111111111', status: 'PRESENT' }] })).toMatchObject({ entries: [{ status: 'PRESENT' }] })
    expect(attendanceCommandSchema.safeParse({ entries: [] }).success).toBe(false)
    expect(attendanceCommandSchema.safeParse({ entries: [{ userId: 'not-a-uuid', status: 'PRESENT' }] }).success).toBe(false)
    expect(attendanceCommandSchema.safeParse({ entries: [{ userId: '11111111-1111-4111-8111-111111111111', status: 'PENDING' }] }).success).toBe(false)
    expect(attendanceCommandSchema.safeParse({ entries: Array.from({ length: 51 }, (_, index) => ({ userId: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`, status: 'ABSENT' })) }).success).toBe(false)
  })

  it('bounds notification pagination and rejects unknown fields', () => {
    expect(notificationQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(notificationQuerySchema.parse({ cursor: 'notification-20', limit: 50 })).toEqual({ cursor: 'notification-20', limit: 50 })
    expect(notificationQuerySchema.safeParse({ limit: 51 }).success).toBe(false)
    expect(notificationQuerySchema.safeParse({ userId: 'forged' }).success).toBe(false)
  })
})
