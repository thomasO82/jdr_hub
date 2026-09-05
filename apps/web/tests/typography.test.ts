import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('JDR Hub typography', () => {
  it('loads the branded font families from the root layout', () => {
    const layout = read('../app/layout.tsx')

    expect(layout).toContain('Hanken+Grotesk')
    expect(layout).toContain('fonts.googleapis.com/css2')
    expect(layout).toContain('Inter')
    expect(layout).toContain('Geist')
  })

  it('assigns headings, body text and labels to the documented font roles', () => {
    const globalStyles = read('../app/globals.css')
    const shell = read('../features/layout/app-shell.tsx')
    const games = read('../features/games/games-list-view.tsx')

    expect(globalStyles).toContain('--font-display:')
    expect(globalStyles).toContain('--font-body:')
    expect(globalStyles).toContain('--font-label:')
    expect(`${shell}\n${games}`).toContain('font-display')
    expect(`${shell}\n${games}`).toContain('font-body')
    expect(`${shell}\n${games}`).toContain('font-label')
  })
})
