import type { MemberRepository } from '../repository.js'

export async function removeMember(input: { gameId: string; ownerId: string; userId: string; repository: MemberRepository; now?: () => Date }): Promise<void> {
  const removed = await input.repository.remove({ gameId: input.gameId, ownerId: input.ownerId, userId: input.userId, now: (input.now ?? (() => new Date()))() })
  if (!removed) throw new Error('MEMBER_NOT_FOUND')
}
