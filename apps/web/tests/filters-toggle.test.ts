import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('games filters toggle', () => {
  it('offers accessible labels for opening and hiding advanced filters', () => {
    const toggle = read('../features/games/filters-toggle.tsx')
    const list = read('../features/games/games-list-view.tsx')

    expect(toggle).toContain('Masquer les filtres')
    expect(toggle).toContain('Afficher les filtres')
    expect(toggle).toContain('aria-expanded')
    expect(list).toContain('FiltersToggle')
  })
})
