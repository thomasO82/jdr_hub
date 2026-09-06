export function canRemoveMember(input: { role: 'PLAYER' | 'GM'; status: 'ACTIVE' | 'REMOVED' }): boolean {
  return input.role === 'PLAYER' && input.status === 'ACTIVE'
}
