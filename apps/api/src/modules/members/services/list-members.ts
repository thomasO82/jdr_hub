import type { GameMemberView } from '@jdr-hub/shared'
import type { MemberRepository } from '../repository.js'

export async function listMembers(input: { gameId: string; ownerId: string; repository: MemberRepository }): Promise<GameMemberView[]> {
  const members = await input.repository.listForOwner(input.gameId, input.ownerId)
  if (members === null) throw new Error('MEMBER_FORBIDDEN')
  return members
}
