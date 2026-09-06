import type { Application } from '@jdr-hub/shared'

export function findApplicationForGame(applications: Application[], gameId: string): Application | null {
  return applications.find((application) => application.gameId === gameId) ?? null
}
