import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('web shell', () => {
  it('has a server page and the official logo asset', () => {
    const page = readFileSync(resolve(web, 'app/page.tsx'), 'utf8')
    const view = readFileSync(resolve(web, 'features/home/home-view.tsx'), 'utf8')
    const logo = resolve(web, 'public/branding/logo.svg')

    expect(existsSync(logo)).toBe(true)
    expect(view).toContain('/branding/logo.svg')
    expect(readFileSync(logo)).toEqual(
      readFileSync(resolve(web, '../../docs/branding/logo.svg')),
    )
    expect(view).toContain('<main')
    expect(view).not.toContain('dangerouslySetInnerHTML')
  })

  it('composes one shared responsive shell with French navigation labels', () => {
    const shell = readFileSync(resolve(web, 'features/layout/app-shell.tsx'), 'utf8')
    const header = readFileSync(resolve(web, 'features/layout/app-header.tsx'), 'utf8')
    const sidebar = readFileSync(resolve(web, 'features/layout/desktop-sidebar.tsx'), 'utf8')
    const mobileHeader = readFileSync(resolve(web, 'features/layout/mobile-header.tsx'), 'utf8')
    const mobileNav = readFileSync(resolve(web, 'features/layout/mobile-bottom-nav.tsx'), 'utf8')
    const composed = `${shell}\n${header}\n${sidebar}\n${mobileHeader}\n${mobileNav}`

    expect(shell).toContain('<AppHeader')
    expect(shell).toContain('<DesktopSidebar')
    expect(shell).toContain('<MobileBottomNav')
    expect(header).toContain('<MobileHeader')
    expect(composed).toContain('/branding/logo.svg')
    expect(composed).toContain('Tableau de bord')
    expect(composed).toContain('Parties')
    expect(composed).toContain('Joueurs')
    expect(composed).toContain('Planning')
    expect(composed).toContain('Profil')
    expect(composed).toContain('min-h-12')
    expect(composed).toContain('focus-visible:')
    expect(composed).toContain('motion-reduce:transition-none')
    expect(composed).toContain('NotificationBell')
    expect(composed).not.toContain('New Game')
    expect(`${header}\n${sidebar}\n${mobileHeader}\n${mobileNav}`).not.toContain('Dashboard')
    expect(`${header}\n${sidebar}\n${mobileHeader}\n${mobileNav}`).not.toContain('Schedule')
  })
})
