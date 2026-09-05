'use client'

import { useEffect, useState } from 'react'
import type { PlanningPage as PlanningData } from '@jdr-hub/shared'
import { AppShell } from '../../features/layout/app-shell'
import { PlanningView } from '../../features/planning/planning-view'
import { createPlanningApi } from '../../lib/planning-api'

export default function PlanningPage() {
  const [planning, setPlanning] = useState<PlanningData | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { void createPlanningApi().get().then((data) => { if (!data) setFailed(true); else setPlanning(data) }) }, [])
  if (failed) return <AppShell active="Schedule"><p className="p-8 text-on-surface-variant" role="alert">Le planning est indisponible. Réessayez dans un instant.</p></AppShell>
  if (!planning) return <AppShell active="Schedule"><p className="p-8 text-on-surface-variant" role="status">Chargement du planning…</p></AppShell>
  return <PlanningView initial={planning} />
}

