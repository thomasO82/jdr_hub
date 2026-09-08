import type { GamificationRepository } from '../repository.js'

export async function awardSessionXp(input: { repository: GamificationRepository; tx?: Parameters<GamificationRepository['awardSessionXp']>[0]['tx']; sessionId: string; presentUserIds: string[]; now: Date }): Promise<void> {
  if (new Set(input.presentUserIds).size !== input.presentUserIds.length) throw new Error('XP_DUPLICATE_PARTICIPANT')
  if (input.tx) {
    await input.repository.awardSessionXp({ tx: input.tx, sessionId: input.sessionId, presentUserIds: input.presentUserIds, now: input.now })
    return
  }
  await input.repository.awardSessionXp({ sessionId: input.sessionId, presentUserIds: input.presentUserIds, now: input.now })
}
