import type { GameStatus } from '@jdr-hub/shared'

export type MessagePolicyInput = {
  gameStatus: GameStatus
  isOwner: boolean
  memberStatus: string
}

const readableStatuses: ReadonlySet<GameStatus> = new Set(['OPEN', 'ACTIVE', 'CLOSED', 'COMPLETED'])

export function canReadGameMessages(input: MessagePolicyInput): boolean {
  if (!readableStatuses.has(input.gameStatus)) return false
  return input.isOwner || input.memberStatus === 'ACTIVE'
}

export function canWriteGameMessages(input: MessagePolicyInput): boolean {
  if (input.gameStatus !== 'OPEN' && input.gameStatus !== 'ACTIVE') return false
  return input.isOwner || input.memberStatus === 'ACTIVE'
}
