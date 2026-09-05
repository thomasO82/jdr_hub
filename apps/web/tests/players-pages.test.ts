import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('players pages', () => {
  it('provides the search page and cards without precise availability', () => {
    const page = read('../app/joueurs/page.tsx')
    const view = read('../features/players/player-search-view.tsx')
    const card = read('../features/players/player-card.tsx')
    expect(page).toContain('PlayerSearchView')
    expect(view).toContain('Trouver des Joueurs')
    expect(view).toContain('Filtrer')
    expect(card).toContain('Compatibilité')
    expect(card).not.toContain('startMinute')
    expect(card).not.toContain('exceptions')
  })
})
