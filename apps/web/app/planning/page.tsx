'use client'

import { useEffect, useState } from 'react'
import type { PlanningPage as PlanningData } from '@jdr-hub/shared'
import { AppShell } from '../../features/layout/app-shell'
import { PlanningView } from '../../features/planning/planning-view'
import { createPlanningApi } from '../../lib/planning-api'

export default function PlanningPage() {
  const [planning, setPlanning] = useState<PlanningData | null>(null)
  const [failed, setFailed] = useState(false)

  async function load(): Promise<void> {
    setFailed(false)
    const data = await createPlanningApi().get()
    if (!data) setFailed(true)
    else setPlanning(data)
  }

  useEffect(() => { void load() }, [])

  if (failed) return <AppShell active="Planning"><main className="min-h-screen px-5 pb-28 pt-24 md:px-8 md:pt-10"><section aria-labelledby="planning-error-title" className="mx-auto grid max-w-2xl gap-3 rounded-xl border border-error/30 bg-surface p-8 text-center" role="alert"><h1 className="m-0 font-display text-3xl font-semibold" id="planning-error-title">Planning indisponible</h1><p className="m-0 text-on-surface-variant">Réessayez dans un instant pour retrouver vos séances.</p><button className="min-h-12 justify-self-center rounded-lg bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none" onClick={() => { void load() }} type="button">Réessayer</button></section></main></AppShell>
  if (!planning) return <AppShell active="Planning"><main className="min-h-screen px-5 pb-28 pt-24 md:px-8 md:pt-10"><p className="mx-auto max-w-6xl text-sm text-on-surface-variant" role="status">Chargement du planning…</p></main></AppShell>
  return <PlanningView initial={planning} />
}
