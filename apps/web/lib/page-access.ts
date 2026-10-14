const PUBLIC_COLLECTION_PREFIXES = ['/mj/', '/tags/', '/jeux/']

export type PageAccess = 'public' | 'authenticated' | 'login-required' | 'unavailable'

/** Keeps the intentionally public discovery pages open and gates account screens after `/me` responds. */
export function resolvePageAccess(pathname: string, responseStatus: number): PageAccess {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  const segments = normalizedPath.split('/').filter(Boolean)

  if (normalizedPath === '/connexion' || normalizedPath === '/parties') return 'public'
  if (segments.length === 2 && segments[0] === 'parties' && segments[1] !== 'nouvelle') return 'public'
  if (PUBLIC_COLLECTION_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix) && segments.length === 2)) return 'public'

  if (responseStatus === 200) return 'authenticated'
  return responseStatus === 401 ? 'login-required' : 'unavailable'
}
