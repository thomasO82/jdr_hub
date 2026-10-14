import { NextRequest, NextResponse } from 'next/server'
import { checkServerPageAccess, shouldBypassPageGuard } from './lib/server-page-access'

const ACCESS_COOKIE_NAME = 'jdr_hub_access'

export async function proxy(request: NextRequest): Promise<NextResponse | Response> {
  const pathname = request.nextUrl.pathname
  if (shouldBypassPageGuard(pathname)) return NextResponse.next()

  const access = await checkServerPageAccess(pathname, request.cookies.get(ACCESS_COOKIE_NAME)?.value)
  if (access === 'public') return NextResponse.next()
  if (access === 'authenticated') {
    if (pathname === '/') return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.next()
  }
  if (access === 'login-required') return NextResponse.redirect(new URL('/connexion', request.url))

  return new Response('La vérification de votre connexion est temporairement indisponible. Réessayez dans un instant.', {
    status: 503,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'content-type': 'text/plain; charset=utf-8',
      'retry-after': '5',
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
