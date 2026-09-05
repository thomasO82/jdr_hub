import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('players visual structure', () => {
  it('uses shared navigation, responsive cards and accessible filters', () => {
    const view = read('../features/players/player-search-view.tsx')
    expect(view).toContain('<AppShell')
    expect(view).toContain('lg:grid-cols')
    expect(view).toContain('aria-label')
    expect(view).not.toContain('module.css')
  })
})
