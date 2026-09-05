import type { Application, ApplicationDecision } from '@jdr-hub/shared'
import type { ApplicationRepository } from '../repository.js'

export async function decideApplication(input: { applicationId: string; ownerId: string; status: ApplicationDecision['status']; repository: ApplicationRepository }): Promise<Application> {
  const application = await input.repository.decide(input.applicationId, input.ownerId, input.status)
  if (!application) throw new Error('APPLICATION_NOT_FOUND')
  return application
}
