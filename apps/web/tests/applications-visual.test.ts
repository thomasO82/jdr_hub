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
})
