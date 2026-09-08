import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('XP visual structure', () => {
  it('composes the profile route from the shared application shell', () => {
    const page = read('../app/profil/xp/page.tsx')
    expect(page).toContain('XpHistoryView')
    expect(page).toContain('export default function')
    expect(page).not.toContain('useState')
  })

  it('shows an accessible progression card and a private paginated history', () => {
    const progress = read('../features/xp/xp-progress-card.tsx')
    const history = read('../features/xp/xp-history-view.tsx')
    expect(progress).toContain('aria-valuenow')
    expect(progress).toContain('aria-valuemax')
    expect(progress).toContain('Niveau')
    expect(history).toContain('Historique XP')
    expect(history).toContain('Charger plus')
    expect(history).toContain('Séance jouée')
    expect(`${progress}\n${history}`).toContain('focus-visible:')
    expect(`${progress}\n${history}`).not.toContain('style={{')
  })

  it('adds progression to the dashboard without duplicating the shell', () => {
    const dashboard = read('../features/dashboard/dashboard-view.tsx')
    expect(dashboard).toContain('dashboard.progression')
    expect(dashboard).toContain('Voir ma progression')
    expect(dashboard).toContain('font-display')
  })
})
