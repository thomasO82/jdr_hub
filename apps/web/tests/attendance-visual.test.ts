import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('absence dialog visual component', () => {
  it('confirms the action and exposes French success and error states', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../features/attendance/absence-dialog.tsx'), 'utf8')
    expect(source).toContain("'use client'")
    expect(source).toContain('Confirmer l’absence')
    expect(source).toContain('Annuler')
    expect(source).toContain('Absence signalée')
    expect(source).toContain('role="dialog"')
    expect(source).toContain('aria-modal="true"')
    expect(source).toContain('focus-visible:')
  })
})
