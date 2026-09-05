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
    const shell = read('../features/layout/app-shell.module.css')
    const games = read('../features/games/games-view.module.css')

    expect(`${shell}\n${games}`).toContain('font-family: Hanken Grotesk')
    expect(`${shell}\n${games}`).toContain('font-family: Inter')
    expect(`${shell}\n${games}`).toContain('font-family: Geist')
  })
})
