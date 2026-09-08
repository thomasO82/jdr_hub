'use client'

import { useEffect, useState } from 'react'
import type { GameManagementView } from '@jdr-hub/shared'
import { GmManagementView } from '../../../../features/gm-management/gm-management-view'
import { AppShell } from '../../../../features/layout/app-shell'
import { createDashboardApi } from '../../../../lib/dashboard-api'

type PageProps = { params: Promise<{ id: string }> }

export default function ManageGamePage({ params }: PageProps) {
  const [management, setManagement] = useState<GameManagementView | null>(null)
  const [failed, setFailed] = useState(false)
  const [api] = useState(() => createDashboardApi())

  useEffect(() => {
    let active = true
    void params.then(({ id }) => api.getManagement(id).then((result) => {
      if (!active) return
      if (result) setManagement(result)
      else setFailed(true)
    }))
    return () => { active = false }
  }, [api, params])

  if (failed) return <AppShell active="Games"><main className="min-h-screen px-5 pb-28 pt-24 md:px-8 md:pt-10"><section aria-labelledby="management-error-title" className="mx-auto grid max-w-2xl gap-3 rounded-xl border border-error/30 bg-surface p-8 text-center"><h1 className="m-0 font-display text-3xl font-semibold" id="management-error-title">Gestion indisponible</h1><p className="m-0 text-sm text-on-surface-variant">Cette partie est introuvable ou vous n’êtes pas son propriétaire.</p></section></main></AppShell>
  if (!management) return <AppShell active="Games"><main className="min-h-screen px-5 pb-28 pt-24 md:px-8 md:pt-10"><p className="mx-auto max-w-6xl text-sm text-on-surface-variant" role="status">Chargement de la gestion…</p></main></AppShell>
  return <GmManagementView management={management} />
}
