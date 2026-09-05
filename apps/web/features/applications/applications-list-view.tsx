'use client'

import { Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Application } from '@jdr-hub/shared'
import { createApplicationsApi } from '../../lib/applications-api'
import { AppShell } from '../layout/app-shell'

type Status = Application['status']
const tabs: Array<{ status: Status; label: string }> = [{ status: 'PENDING', label: 'En attente' }, { status: 'ACCEPTED', label: 'Acceptées' }, { status: 'REJECTED', label: 'Refusées' }]

export function ApplicationsListView({ applications, canDecide = false }: { applications: Application[]; canDecide?: boolean }) {
  const [active, setActive] = useState<Status>('PENDING')
  const [items, setItems] = useState(applications)
  const [error, setError] = useState<string | null>(null)
  const visible = useMemo(() => items.filter((application) => application.status === active), [active, items])

  async function decide(applicationId: string, status: 'ACCEPTED' | 'REJECTED') {
    setError(null)
    const updated = await createApplicationsApi().decide(applicationId, status)
    if (!updated) { setError('La décision n’a pas pu être enregistrée. Réessayez.'); return }
    setItems((current) => current.map((application) => application.id === updated.id ? updated : application))
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10">
        <section className="mx-auto max-w-6xl" aria-labelledby="applications-title">
          <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Campagne actuelle</p>
          <h1 className="m-0 mt-2 font-display text-4xl font-semibold tracking-tight" id="applications-title">Gestion des Candidatures</h1>
          <p className="m-0 mt-2 text-on-surface-variant">Suivez vos demandes et les réponses des maîtres du jeu.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <section>
              <div className="flex gap-2 overflow-x-auto border-b border-outline-variant pb-3" role="tablist" aria-label="Statut des candidatures">{tabs.map((tab) => <button className={active === tab.status ? 'whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary' : 'whitespace-nowrap rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm text-on-surface-variant'} key={tab.status} onClick={() => setActive(tab.status)} role="tab" aria-selected={active === tab.status} type="button">{tab.label} ({items.filter((application) => application.status === tab.status).length})</button>)}</div>
              {error && <p className="mt-4 rounded-lg border border-error/30 bg-error-container p-3 text-sm text-on-error-container" role="alert">{error}</p>}
              <div className="mt-5 grid gap-4">{visible.map((application) => <article className="relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm" key={application.id}><div className={active === 'PENDING' ? 'absolute inset-y-0 left-0 w-1 bg-primary' : 'absolute inset-y-0 left-0 w-1 bg-surface-variant'} /><div className="flex items-start justify-between gap-4"><div><h2 className="m-0 font-display text-xl font-semibold">{application.gameTitle}</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">{application.username}</p></div><span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold">{tabs.find((tab) => tab.status === application.status)?.label}</span></div>{application.message && <p className="m-0 mt-4 rounded-lg bg-surface-container-low p-3 text-sm italic text-on-surface-variant">“{application.message}”</p>}{canDecide && active === 'PENDING' && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-primary" onClick={() => void decide(application.id, 'ACCEPTED')} type="button"><Check size={16} />Accepter</button><button className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-semibold text-on-surface hover:border-error hover:text-error focus-visible:outline-2 focus-visible:outline-primary" onClick={() => void decide(application.id, 'REJECTED')} type="button"><X size={16} />Refuser</button></div>}</article>)}</div>
              {visible.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-outline-variant bg-surface p-10 text-center text-sm text-on-surface-variant">Aucune candidature dans cet état.</p>}
            </section>
            <aside className="h-fit rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm"><h2 className="m-0 font-display text-xl font-semibold">Résumé</h2><dl className="mt-4 grid grid-cols-3 gap-2 text-center">{tabs.map((tab) => <div className="rounded-lg bg-surface-container-low p-3" key={tab.status}><dt className="text-xs text-on-surface-variant">{tab.label}</dt><dd className="m-0 mt-1 font-display text-2xl font-semibold">{items.filter((application) => application.status === tab.status).length}</dd></div>)}</dl></aside>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
