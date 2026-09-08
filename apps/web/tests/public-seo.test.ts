import { describe, expect, it } from 'vitest'
import { isIndexableGamesQuery, slugifyPublicLabel } from '../lib/public-seo'

describe('public SEO policy', () => {
  it('never marks free searches as indexable', () => {
    expect(isIndexableGamesQuery({})).toBe(true)
    expect(isIndexableGamesQuery({ q: 'crypte' })).toBe(false)
    expect(isIndexableGamesQuery({ format: 'TABLE' })).toBe(false)
    expect(isIndexableGamesQuery({ dateFrom: '2026-10-01' })).toBe(false)
    expect(isIndexableGamesQuery({ page: 2 })).toBe(false)
  })

  it('normalizes labels into stable public slugs', () => {
    expect(slugifyPublicLabel('L’Appel de Cthulhu')).toBe('l-appel-de-cthulhu')
  })
})
