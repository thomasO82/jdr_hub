import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('new game form visual hierarchy', () => {
  it('uses a dedicated secondary action and generous form rhythm', () => {
    const view = read('../features/games/new-game-view.tsx')
    expect(view).toContain('gap-6')
    expect(view).toContain('border-primary-fixed-dim')
    expect(view).toContain('focus-visible:outline')
    expect(view).not.toContain('games-view.module.css')
  })
})
