import { describe, expect, it } from 'vitest'
import { resolvePageAccess } from '../lib/page-access'

describe('private page access', () => {
  it('keeps catalogue pages available to visitors', () => {
    for (const pathname of ['/parties', '/parties/la-crypte', '/mj/meneuse', '/tags/fantasy', '/jeux/dnd', '/connexion']) {
      expect(resolvePageAccess(pathname, 401)).toBe('public')
    }
  })

  it('requires an authenticated session for application pages', () => {
    for (const pathname of ['/dashboard', '/parties/nouvelle', '/parties/la-crypte/vote', '/planning', '/profil']) {
      expect(resolvePageAccess(pathname, 401)).toBe('login-required')
      expect(resolvePageAccess(pathname, 200)).toBe('authenticated')
    }
  })

  it('requires a session by default when a path is not explicitly public', () => {
    expect(resolvePageAccess('/route-inconnue', 401)).toBe('login-required')
  })

  it('does not misreport an unavailable session service as a signed-out user', () => {
    expect(resolvePageAccess('/dashboard', 503)).toBe('unavailable')
  })
})
