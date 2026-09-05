import type { GameStatus, GameType } from '@jdr-hub/shared'

export function canTransitionGameStatus(current: GameStatus, next: GameStatus): boolean {
  if (current === next) return true
  const allowed: Record<GameStatus, GameStatus[]> = {
    DRAFT: ['OPEN', 'CLOSED'], OPEN: ['ACTIVE', 'CLOSED'], ACTIVE: ['CLOSED', 'COMPLETED'],
    CLOSED: ['COMPLETED'], COMPLETED: [],
  }
  return allowed[current].includes(next)
}

export function maxSessionsFor(type: GameType): number | null {
  return type === 'ONE_SHOT' ? 3 : null
}

export function slugifyGameTitle(title: string): string {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160) || 'partie'
}

export function slugifyPublicLabel(label: string): string {
  return label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160) || 'public'
}
