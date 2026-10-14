import { describe, expect, it } from 'vitest'
import { sessionWindowValidationMessage } from '../features/gm-management/session-scheduling-validation.js'

describe('sessionWindowValidationMessage', () => {
  it('explains that an end before the start cannot be proposed', () => {
    expect(sessionWindowValidationMessage({
      startsAt: '2026-10-15T13:32:00.000Z',
      endsAt: '2026-10-14T15:32:00.000Z',
    })).toBe('L’heure de fin doit être postérieure à l’heure de début.')
  })

  it('accepts an increasing interval within the scheduling limits', () => {
    expect(sessionWindowValidationMessage({
      startsAt: '2026-10-15T13:32:00.000Z',
      endsAt: '2026-10-15T15:32:00.000Z',
    })).toBeNull()
  })
})
