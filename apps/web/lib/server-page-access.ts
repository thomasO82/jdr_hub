import { resolvePageAccess } from './page-access'

const ACCESS_COOKIE_NAME = 'jdr_hub_access'

/** Returns true for API and static resources that are not Next.js pages. */
export function shouldBypassPageGuard(pathname: string): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname

  return normalizedPath === '/api'
    || normalizedPath.startsWith('/api/')
    || normalizedPath === '/_next'
    || normalizedPath.startsWith('/_next/')
    || normalizedPath === '/favicon.ico'
    || normalizedPath === '/robots.txt'
    || normalizedPath === '/sitemap.xml'
    || normalizedPath.startsWith('/branding/')
}

/**
 * Checks an access credential against the authoritative Hono session endpoint.
 * A fetch failure or unexpected response is kept distinct from an expired session
 * so a temporary API outage never deletes the user's cookies.
 */
export async function checkServerPageAccess(
  pathname: string,
  accessCookie: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<'public' | 'authenticated' | 'login-required' | 'unavailable'> {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (normalizedPath === '/connexion') return 'public'
  if (!accessCookie) return resolvePageAccess(normalizedPath, 401)

  try {
    const baseUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:8787'
    const response = await fetcher(new URL('/me', baseUrl), {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        cookie: `${ACCESS_COOKIE_NAME}=${accessCookie}`,
      },
      redirect: 'manual',
    })
    return resolvePageAccess(normalizedPath, response.status)
  } catch {
    return 'unavailable'
  }
}
