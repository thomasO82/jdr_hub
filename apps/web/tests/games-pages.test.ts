import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('games pages', () => {
  it('keeps route files as thin App Router entries', () => {
    expect(read('../app/parties/page.tsx')).toContain("from '../../features/games/games-list-view'")
    expect(read('../app/parties/nouvelle/page.tsx')).toContain("from '../../../features/games/new-game-view'")
  })

  it('exposes the essential discovery and creation controls', () => {
    const list = read('../features/games/games-list-view.tsx')
    const create = read('../features/games/new-game-view.tsx')
    expect(list).toContain('Rechercher une partie')
    expect(list).toContain('Tous les tags doivent correspondre')
    expect(create).toContain('Créer une partie')
    expect(create).toContain('ONE_SHOT')
    expect(create).toContain('CAMPAIGN')
  })
})
