import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('games pages', () => {
  it('keeps route files as thin App Router entries', () => {
    expect(read('../app/parties/page.tsx')).toContain("from '../../features/games/games-list-view'")
    expect(read('../app/parties/nouvelle/page.tsx')).toContain("from '../../../features/games/new-game-view'")
    expect(read('../app/parties/[slug]/page.tsx')).toContain("from '../../../features/games/game-detail-view'")
  })

  it('exposes the essential discovery and creation controls', () => {
    const list = read('../features/games/games-list-view.tsx')
    const create = read('../features/games/new-game-view.tsx')
    expect(list).toContain('Rechercher une partie')
    expect(list).toContain('Tous les tags doivent correspondre')
    expect(list).toContain('/parties/${game.slug}')
    expect(create).toContain('Créer une partie')
    expect(create).toContain('ONE_SHOT')
    expect(create).toContain('CAMPAIGN')
  })

  it('follows the detail mockup hierarchy', () => {
    const detail = read('../features/games/game-detail-view.tsx')
    expect(detail).toContain('{game.title}')
    expect(detail).toContain('Synopsis')
    expect(detail).toContain("Rejoindre l'aventure")
    expect(detail).toContain('Détails de la partie')
  })

  it('loads catalogue and details through the API client', () => {
    expect(read('../features/games/games-list-view.tsx')).toContain('createGamesApi')
    expect(read('../app/parties/[slug]/page.tsx')).toContain('createGamesApi')
  })
})
