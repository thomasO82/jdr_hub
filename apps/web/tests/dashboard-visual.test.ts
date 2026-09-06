import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('dashboard visual structure', () => {
  it('matches the authenticated shell hierarchy and responsive dashboard states', () => {
    const view = read('../features/dashboard/dashboard-view.tsx')
    const block = read('../features/dashboard/dashboard-block.tsx')
    expect(view).toContain('<AppShell')
    expect(view).toContain('Prochaine séance')
    expect(view).toContain('Parties actives')
    expect(view).toContain('lg:grid-cols')
    expect(view).toContain('md:grid-cols')
    expect(view).toContain('font-display')
    expect(block).toContain('Réessayer')
    expect(block).toContain('role="alert"')
    expect(block).toContain('role="status"')
    expect(`${view}\n${block}`).toContain('focus-visible:')
    expect(`${view}\n${block}`).not.toContain('style={{')
  })

  it('keeps the root route as a route composition for the dashboard', () => {
    const page = read('../app/page.tsx')
    expect(page).toContain('DashboardView')
    expect(page).not.toContain('HomeView')
  })
})
