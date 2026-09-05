import type { SchedulingRepository, PlanningPage } from '../repository.js'

export async function getPlanning(input: { userId: string; from: Date | null; to: Date | null; repository: SchedulingRepository }): Promise<PlanningPage> {
  return input.repository.listPlanning({ userId: input.userId, from: input.from, to: input.to })
}

