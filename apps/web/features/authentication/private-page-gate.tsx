'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { resolvePageAccess } from '../../lib/page-access'

type Verification = { pathname: string; state: 'checking' | 'authenticated' | 'unavailable' }

export function PrivatePageGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [attempt, setAttempt] = useState(0)
  const [verification, setVerification] = useState<Verification>({ pathname: '', state: 'checking' })
  const access = resolvePageAccess(pathname, verification.pathname === pathname && verification.state === 'authenticated' ? 200 : 401)

  useEffect(() => {
    if (resolvePageAccess(pathname, 401) !== 'login-required') return

    let active = true
    setVerification({ pathname, state: 'checking' })
    void fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: { accept: 'application/json' } })
      .then((response) => {
        if (!active) return
        const result = resolvePageAccess(pathname, response.status)
        if (result === 'login-required') {
          router.replace('/connexion')
          return
        }
        if (result === 'authenticated') setVerification({ pathname, state: 'authenticated' })
        else setVerification({ pathname, state: 'unavailable' })
      })
      .catch(() => {
        if (active) setVerification({ pathname, state: 'unavailable' })
      })

    return () => { active = false }
  }, [attempt, pathname, router])

  if (access === 'public' || (verification.pathname === pathname && verification.state === 'authenticated')) return children

  if (verification.pathname === pathname && verification.state === 'unavailable') {
    return <main className="grid min-h-screen place-items-center bg-background px-5 py-12 font-body text-on-surface"><section className="grid max-w-md gap-4 text-center" aria-labelledby="session-check-title"><h1 className="m-0 font-display text-2xl font-semibold" id="session-check-title">Connexion indisponible</h1><p className="m-0 text-sm text-on-surface-variant">Nous ne pouvons pas vérifier votre connexion. Réessayez dans un instant.</p><button className="min-h-11 justify-self-center rounded-lg bg-primary px-5 font-body font-semibold text-on-primary hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setAttempt((value) => value + 1)} type="button">Réessayer</button></section></main>
  }

  return <main className="grid min-h-screen place-items-center bg-background px-5 py-12 font-body text-on-surface"><p className="m-0 text-sm text-on-surface-variant" role="status">Vérification de votre connexion…</p></main>
}
