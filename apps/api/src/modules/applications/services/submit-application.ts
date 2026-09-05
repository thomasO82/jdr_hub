import type { Application, ApplicationCommand } from '@jdr-hub/shared'
import type { ApplicationRepository } from '../repository.js'

export async function submitApplication(input: { userId: string; gameId: string; message?: ApplicationCommand['message']; repository: ApplicationRepository }): Promise<Application> {
  const game = await input.repository.findEligibleGame(input.gameId)
  if (!game || game.visibility !== 'PUBLIC' || game.status !== 'OPEN') throw new Error('APPLICATION_NOT_FOUND')
  if (game.ownerId === input.userId) throw new Error('APPLICATION_CONFLICT')
  if (await input.repository.findByGameAndUser(input.gameId, input.userId)) throw new Error('APPLICATION_CONFLICT')
  return input.repository.create({ gameId: input.gameId, userId: input.userId, message: input.message ?? null })
}
