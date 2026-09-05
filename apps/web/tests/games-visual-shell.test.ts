import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('games visual shell', () => {
  it('uses the shared desktop sidebar and mobile navigation from the mockups', () => {
    const shell = read('../features/layout/app-shell.tsx')
    const list = read('../features/games/games-list-view.tsx')

    expect(shell).toContain('/branding/logo.svg')
    expect(shell).toContain('Dashboard')
    expect(shell).toContain('Profile')
    expect(shell).toContain('New Game')
    expect(shell).toContain('bottomNavigation')
    expect(list).toContain('AppShell')
    expect(list).toContain('cover')
  })
})
