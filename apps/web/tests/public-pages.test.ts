import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('public pages', () => {
  it('renders the catalogue through the public server client', () => {
    const page = read('../features/games/games-list-view.tsx')
    expect(page).toContain('createPublicGamesApi')
    expect(page).toContain('Catalogue de Parties')
    expect(page).not.toContain('ownerId')
  })

  it('keeps the detail route server-rendered and public', () => {
    const page = read('../app/parties/[slug]/page.tsx')
    expect(page).toContain('generateMetadata')
    expect(page).toContain('notFound()')
    expect(page).toContain('createPublicGamesApi')
  })
})
