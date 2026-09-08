import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('availability and player search states', () => {
  it('keeps initial availability failures recoverable and translated', () => {
    const view = read('../features/availability/availability-view.tsx')

    expect(view).toContain('Disponibilités indisponibles')
    expect(view).toContain('onRetry')
    expect(view).toContain('role="alert"')
    expect(view).not.toContain('catch (error)')
  })

  it('exposes the mobile player filter disclosure and safe result states', () => {
    const view = read('../features/players/player-search-view.tsx')
    const states = read('../features/ui/async-state.tsx')

    expect(view).toContain('id="player-filters"')
    expect(view).toContain('aria-expanded={filtersOpen}')
    expect(states).toContain('role="status"')
    expect(states).toContain('role="alert"')
    expect(view).toContain('Aucun joueur ne correspond')
  })
})
