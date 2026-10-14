export type PageAccess = 'public' | 'authenticated' | 'login-required' | 'unavailable'

/** Resolves the two public entry pages and the default-private page policy. */
export function resolvePageAccess(pathname: string, responseStatus: number): PageAccess {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname

  if (normalizedPath === '/connexion') return 'public'
  if (responseStatus === 401 && normalizedPath === '/') return 'public'

  if (responseStatus === 200) return 'authenticated'
  return responseStatus === 401 ? 'login-required' : 'unavailable'
}
