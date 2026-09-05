import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('availability pages', () => {
  it('provides an availability page with private settings and save state', () => {
    const page = read('../app/disponibilites/page.tsx')
    const view = read('../features/availability/availability-view.tsx')
    expect(page).toContain('AvailabilityView')
    expect(view).toContain('Enregistrer')
    expect(view).toContain('Disponibilités publiques')
    expect(view).toContain('aria-label')
    expect(view).not.toContain('module.css')
  })
})
