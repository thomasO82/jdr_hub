import { randomUUID } from 'node:crypto'
import type { Application } from '@jdr-hub/shared'
import type { ApplicationRepository } from '../../src/modules/applications/repository.js'

export type TestApplicationGame = {
  id: string
  ownerId: string
  visibility: 'PUBLIC' | 'PRIVATE'
  status: 'OPEN' | 'CLOSED' | 'ACTIVE'
  maxPlayers: number
  slug?: string
}

type StoredApplication = Omit<Application, 'gameTitle' | 'username' | 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }

export function createInMemoryApplicationsRepository(seed: { games?: TestApplicationGame[]; applications?: Array<{ id: string; gameId: string; userId: string; message: string | null; status: Application['status'] }> } = {}): ApplicationRepository & { countActiveMembers(gameId: string): Promise<number> } {
  const games = new Map((seed.games ?? []).map((game) => [game.id, game]))
  const applications = new Map<string, StoredApplication>((seed.applications ?? []).map((application) => [application.id, { ...application, createdAt: new Date(), updatedAt: new Date() }]))
  const members = new Set<string>()
  const view = (application: StoredApplication): Application => ({ ...application, gameTitle: games.get(application.gameId)?.id ?? application.gameId, username: application.userId })

  return {
    async findEligibleGame(gameId: string) { return games.get(gameId) ?? null },
    async findByGameAndUser(gameId: string, userId: string) { const application = [...applications.values()].find((value) => value.gameId === gameId && value.userId === userId); return application ? view(application) : null },
    async create(input: { gameId: string; userId: string; message: string | null }) {
      if ([...applications.values()].some((value) => value.gameId === input.gameId && value.userId === input.userId)) throw new Error('APPLICATION_CONFLICT')
      const now = new Date()
      const application: StoredApplication = { id: randomUUID(), ...input, status: 'PENDING', createdAt: now, updatedAt: now }
      applications.set(application.id, application)
      return view(application)
    },
    async findForUser(userId: string) { return [...applications.values()].filter((value) => value.userId === userId).map(view) },
    async findForGameOwner(gameId: string, ownerId: string) {
      const game = games.get(gameId)
      if (!game || game.ownerId !== ownerId) return null
      return [...applications.values()].filter((value) => value.gameId === gameId).map(view)
    },
    async decide(applicationId: string, ownerId: string, status: 'ACCEPTED' | 'REJECTED') {
      const application = applications.get(applicationId)
      if (!application) return null
      const game = games.get(application.gameId)
      if (!game || game.ownerId !== ownerId) return null
      if (application.status !== 'PENDING') throw new Error('APPLICATION_CONFLICT')
      if (status === 'ACCEPTED') {
        const count = [...members].filter((key) => key.startsWith(`${application.gameId}:`)).length
        if (count >= game.maxPlayers) throw new Error('APPLICATION_CONFLICT')
        members.add(`${application.gameId}:${application.userId}`)
      }
      const updated = { ...application, status, updatedAt: new Date() } as StoredApplication
      applications.set(applicationId, updated)
      return view(updated)
    },
    async countActiveMembers(gameId: string) { return [...members].filter((key) => key.startsWith(`${gameId}:`)).length },
  }
}
