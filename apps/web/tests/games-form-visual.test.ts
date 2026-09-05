import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('new game form visual hierarchy', () => {
  it('uses a dedicated secondary action and generous form rhythm', () => {
    const view = read('../features/games/new-game-view.tsx')
    const styles = read('../features/games/games-view.module.css')

    expect(view).toContain('styles.secondary')
    expect(view).toContain('styles.formActions')
    expect(styles).toContain('.card form { gap: 24px; }')
    expect(styles).toContain('.secondary {')
  })
})
