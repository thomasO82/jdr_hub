'use client'

import { useEffect, useState } from 'react'
import type { DashboardData } from '@jdr-hub/shared'
import { AppShell } from '../../features/layout/app-shell'
import { DashboardView } from '../../features/dashboard/dashboard-view'
import { createDashboardApi } from '../../lib/dashboard-api'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    void createDashboardApi().get().then((data) => {
      if (!data) setFailed(true)
      else setDashboard(data)
    })
  }, [])

  if (failed) return <AppShell active="Dashboard"><main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10"><p className="mx-auto max-w-7xl text-on-surface-variant" role="alert">Le tableau de bord est indisponible. Réessayez dans un instant.</p></main></AppShell>
  if (!dashboard) return <AppShell active="Dashboard"><main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10"><p className="mx-auto max-w-7xl text-on-surface-variant" role="status">Chargement du tableau de bord…</p></main></AppShell>
  return <DashboardView initial={dashboard} />
}
