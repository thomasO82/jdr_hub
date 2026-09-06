import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('application visual structure', () => {
  it('uses accessible Tailwind controls for application actions', () => {
    const form = read('../features/applications/application-form.tsx')
    expect(form).toContain('aria-label')
    expect(form).toContain('textarea')
    expect(form).not.toContain('module.css')
  })

  it('checks the current user application before displaying the form', () => {
    const form = read('../features/applications/application-form.tsx')
    const status = read('../features/applications/application-status.tsx')
    expect(form).toContain('useEffect')
    expect(form).toContain('getMineForGame')
    expect(form).toContain('getApplicationView')
    expect(form).toContain("view === 'HIDDEN'")
    expect(status).toContain('Candidature envoyée')
    expect(status).toContain('En attente de réponse du MJ')
  })
})
