import type { AvailabilityRepository } from '../repository.js'

export async function getAvailability(input: { userId: string; repository: AvailabilityRepository }) {
  return input.repository.getForUser(input.userId)
}
