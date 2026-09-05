import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('application pages', () => {
  it('adds the candidature form to the public detail and a dedicated list page', () => {
    const detail = read('../features/games/game-detail-view.tsx')
    expect(detail).toContain('ApplicationForm')
    expect(detail).toContain("Postuler pour rejoindre")
    const page = read('../app/candidatures/page.tsx')
    expect(page).toContain('ApplicationsListView')
    expect(page).toContain('createApplicationsApi')
  })

  it('keeps application cards aligned with the D06/M04 hierarchy', () => {
    const view = read('../features/applications/applications-list-view.tsx')
    expect(view).toContain('En attente')
    expect(view).toContain('Acceptées')
    expect(view).toContain('Refusées')
    expect(view).toContain('Accepter')
    expect(view).toContain('Refuser')
    expect(view).not.toContain('.module.css')
  })
})
