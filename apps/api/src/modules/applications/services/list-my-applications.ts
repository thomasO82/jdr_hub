import type { Application } from '@jdr-hub/shared'
import type { ApplicationRepository } from '../repository.js'

export function listMyApplications(input: { userId: string; repository: ApplicationRepository }): Promise<Application[]> {
  return input.repository.findForUser(input.userId)
}
