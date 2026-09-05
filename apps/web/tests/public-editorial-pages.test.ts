import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('public editorial pages', () => {
  it('renders MJ, tag and system pages from the public client', () => {
    for (const path of ['../app/mj/[slug]/page.tsx', '../app/tags/[slug]/page.tsx', '../app/jeux/[slug]/page.tsx']) {
      const page = read(path)
      expect(page).toContain('createPublicGamesApi')
      expect(page).toContain('generateMetadata')
      expect(page).toContain('notFound()')
    }
  })

  it('defines sitemap and robots from public routes', () => {
    expect(read('../app/sitemap.ts')).toContain('/parties')
    expect(read('../app/robots.ts')).toContain('disallow')
  })

  it('marks filtered catalogue URLs as noindex', () => {
    const page = read('../app/parties/page.tsx')
    expect(page).toContain('isIndexableGamesQuery')
    expect(page).toContain('index: false')
  })
})
