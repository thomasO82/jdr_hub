import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('games visual shell', () => {
  it('uses the shared desktop sidebar and mobile navigation from the mockups', () => {
    const shell = `${read('../features/layout/app-shell.tsx')}\n${read('../features/layout/desktop-sidebar.tsx')}\n${read('../features/layout/mobile-bottom-nav.tsx')}\n${read('../features/layout/navigation.ts')}`
    const list = read('../features/games/games-list-view.tsx')

    expect(shell).toContain('/branding/logo.svg')
    expect(shell).toContain('Tableau de bord')
    expect(shell).toContain('Profil')
    expect(shell).toContain('Créer une partie')
    expect(shell).toContain('Navigation mobile')
    expect(shell).not.toContain('app-shell.module.css')
    expect(shell).toContain('lg:')
    expect(shell).toContain('fixed')
    expect(shell).toContain('bottom-')
    expect(list).toContain('AppShell')
    expect(list).toContain('cover')
  })
})
