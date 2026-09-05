import { describe, expect, it } from 'vitest'
import { isCompatibleWithWindow, validateAvailabilityRules, validateTimeZone } from '../../../src/modules/availability/policy.js'

describe('availability policy', () => {
  it('rejects overlapping rules while allowing adjacent rules', () => {
    expect(() => validateAvailabilityRules([
      { dayOfWeek: 1, startMinute: 600, endMinute: 720 },
      { dayOfWeek: 1, startMinute: 700, endMinute: 800 },
    ])).toThrow('AVAILABILITY_OVERLAP')

    expect(() => validateAvailabilityRules([
      { dayOfWeek: 1, startMinute: 600, endMinute: 720 },
      { dayOfWeek: 1, startMinute: 720, endMinute: 800 },
    ])).not.toThrow()
  })

  it('matches only a requested day and overlapping window', () => {
    const rules = [{ dayOfWeek: 3, startMinute: 19 * 60, endMinute: 22 * 60 }]
    expect(isCompatibleWithWindow(rules, { dayOfWeek: 3, startMinute: 20 * 60, endMinute: 21 * 60 })).toBe(true)
    expect(isCompatibleWithWindow(rules, { dayOfWeek: 2, startMinute: 20 * 60, endMinute: 21 * 60 })).toBe(false)
    expect(isCompatibleWithWindow(rules, { dayOfWeek: 3, startMinute: 22 * 60, endMinute: 23 * 60 })).toBe(false)
  })

  it('accepts IANA timezones and rejects unknown zones', () => {
    expect(validateTimeZone('Europe/Paris')).toBe(true)
    expect(validateTimeZone('Not/A_Timezone')).toBe(false)
  })
})
