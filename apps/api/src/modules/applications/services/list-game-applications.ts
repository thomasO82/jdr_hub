import type { Application } from '@jdr-hub/shared'
import type { ApplicationRepository } from '../repository.js'

export async function listGameApplications(input: { gameId: string; ownerId: string; repository: ApplicationRepository }): Promise<Application[]> {
  const applications = await input.repository.findForGameOwner(input.gameId, input.ownerId)
  if (!applications) throw new Error('APPLICATION_FORBIDDEN')
  return applications
}
