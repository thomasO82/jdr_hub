import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('planning accessibility semantics', () => {
  it('labels the month navigation and the session absence action', () => {
    const view = read('../features/planning/planning-view.tsx')
    const card = read('../features/planning/session-card.tsx')

    expect(view).toContain('Mois précédent')
    expect(view).toContain('Mois suivant')
    expect(view).toContain('id="planning-empty"')
    expect(view).toContain('aria-describedby="planning-empty"')
    expect(card).toContain('aria-label={`Signaler une absence pour ${session.gameTitle}`')
  })
})
