import type { AvailabilityPayload } from '@jdr-hub/shared'
import { validateAvailabilityRules, validateTimeZone } from '../policy.js'
import type { AvailabilityRepository } from '../repository.js'

export async function replaceAvailability(input: {
  userId: string
  payload: AvailabilityPayload
  repository: AvailabilityRepository
  now?: (() => Date) | Date
}) {
  if (!validateTimeZone(input.payload.timezone)) throw new Error('AVAILABILITY_TIMEZONE_INVALID')
  validateAvailabilityRules(input.payload.rules)
  const now = typeof input.now === 'function' ? input.now() : input.now ?? new Date()
  return input.repository.replaceForUser(input.userId, input.payload, now)
}
