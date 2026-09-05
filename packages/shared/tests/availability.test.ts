import { describe, expect, it } from 'vitest'
import {
  availabilityExceptionSchema,
  availabilityPayloadSchema,
  availabilityPreferencesSchema,
  availabilityRuleSchema,
  playerQuerySchema,
  playerSummarySchema,
} from '../src/availability.js'

const validRule = { dayOfWeek: 1, startMinute: 18 * 60, endMinute: 22 * 60 }

describe('availability shared contracts', () => {
  it('accepts a bounded weekly rule', () => {
    expect(availabilityRuleSchema.parse(validRule)).toEqual(validRule)
  })

  it('rejects invalid day and minute bounds', () => {
    expect(() => availabilityRuleSchema.parse({ ...validRule, dayOfWeek: 7 })).toThrow()
    expect(() => availabilityRuleSchema.parse({ ...validRule, startMinute: -1 })).toThrow()
    expect(() => availabilityRuleSchema.parse({ ...validRule, endMinute: 1441 })).toThrow()
    expect(() => availabilityRuleSchema.parse({ ...validRule, startMinute: 20 * 60, endMinute: 20 * 60 })).toThrow()
  })

  it('rejects unknown fields in every transport contract', () => {
    expect(() => availabilityRuleSchema.parse({ ...validRule, userId: 'forged' })).toThrow()
    expect(() => availabilityPreferencesSchema.parse({ availabilityPublic: false, invitationNotifications: true, extra: true })).toThrow()
    expect(() => playerQuerySchema.parse({ q: 'mage', unknown: true })).toThrow()
  })

  it('accepts a dated exception with a bounded label', () => {
    const exception = { startsAt: '2026-12-24T00:00:00.000Z', endsAt: '2026-12-26T00:00:00.000Z', label: 'Vacances' }
    expect(availabilityExceptionSchema.parse(exception)).toEqual(exception)
    expect(() => availabilityExceptionSchema.parse({ ...exception, endsAt: exception.startsAt })).toThrow()
  })

  it('bounds payload and player query sizes', () => {
    expect(() => availabilityPayloadSchema.parse({ timezone: 'Europe/Paris', rules: Array.from({ length: 51 }, () => validRule), exceptions: [], preferences: { availabilityPublic: false, invitationNotifications: true }, preferredSystems: [] })).toThrow()
    expect(playerQuerySchema.parse({ page: 1, pageSize: 20 })).toMatchObject({ page: 1, pageSize: 20 })
    expect(() => playerQuerySchema.parse({ page: 0 })).toThrow()
    expect(() => playerQuerySchema.parse({ pageSize: 51 })).toThrow()
  })

  it('keeps the player projection aggregate and nullable', () => {
    const player = { id: '00000000-0000-4000-8000-000000000001', username: 'Mélina', avatarUrl: null, level: null, preferredSystems: ['D&D 5e'], availabilityCompatible: null }
    expect(playerSummarySchema.parse(player)).toEqual(player)
    expect(() => playerSummarySchema.parse({ ...player, startMinute: 600 })).toThrow()
  })
})
