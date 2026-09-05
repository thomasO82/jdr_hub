'use client'

import { useEffect, useState } from 'react'
import type { AvailabilityPayload, AvailabilitySnapshot } from '@jdr-hub/shared'
import { createAvailabilityApi } from '../../lib/availability-api'
import { AppShell } from '../layout/app-shell'
import { AvailabilityGrid } from './availability-grid'

const emptyPayload: AvailabilityPayload = {
  timezone: 'Europe/Paris',
  rules: [],
  exceptions: [],
  preferences: { availabilityPublic: false, invitationNotifications: true, experienceLevel: null },
  preferredSystems: [],
}

export function AvailabilityView({ initial }: { initial: AvailabilitySnapshot | null }) {
  const [payload, setPayload] = useState<AvailabilityPayload>(initial ?? emptyPayload)
  const [loading, setLoading] = useState(!initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial) return
    void createAvailabilityApi().get().then((snapshot) => { if (snapshot) setPayload(snapshot); setLoading(false) })
  }, [initial])

  async function save() {
    setSaving(true); setError(null); setMessage(null)
    const saved = await createAvailabilityApi().replace(payload)
    if (!saved) setError('Impossible d’enregistrer vos disponibilités. Vérifiez les horaires puis réessayez.')
    else { setPayload(saved); setMessage('Disponibilités enregistrées.') }
    setSaving(false)
  }

  if (loading) return <p className="p-8 font-body text-on-surface-variant" role="status">Chargement de vos disponibilités…</p>

  return (
    <AppShell active="Profile">
      <main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10">
        <section className="mx-auto max-w-6xl" aria-labelledby="availability-title">
          <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Votre rythme de jeu</p>
          <h1 className="m-0 mt-2 font-display text-4xl font-semibold tracking-tight" id="availability-title">Ma Gestion des Disponibilités</h1>
          <p className="m-0 mt-2 max-w-2xl text-on-surface-variant">Indiquez vos créneaux habituels pour faciliter l’organisation de vos prochaines parties.</p>
          {error && <p className="mt-6 rounded-lg border border-error/30 bg-error-container p-3 text-sm text-on-error-container" role="alert">{error}</p>}
          {message && <p className="mt-6 rounded-lg border border-primary/30 bg-primary-fixed p-3 text-sm text-on-primary-fixed" role="status">{message}</p>}
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section className="rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm" aria-labelledby="weekly-title">
              <div className="flex items-start justify-between gap-4"><div><h2 className="m-0 font-display text-2xl font-semibold" id="weekly-title">Chaque semaine</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">Horaires locaux · {payload.timezone}</p></div><label className="text-right text-xs font-semibold text-on-surface-variant" htmlFor="timezone">Fuseau<select className="mt-1 block min-h-10 rounded-lg border border-outline-variant bg-surface px-2 text-sm text-on-surface focus-visible:outline-2 focus-visible:outline-primary" id="timezone" value={payload.timezone} onChange={(event) => setPayload({ ...payload, timezone: event.target.value })}><option>Europe/Paris</option><option>Europe/London</option><option>America/Montreal</option></select></label></div>
              <div className="mt-6"><AvailabilityGrid rules={payload.rules} onChange={(rules) => setPayload({ ...payload, rules })} /></div>
            </section>
            <aside className="h-fit rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm" aria-labelledby="preferences-title">
              <h2 className="m-0 font-display text-2xl font-semibold" id="preferences-title">Préférences</h2>
              <label className="mt-5 flex items-start gap-3 text-sm"><input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={payload.preferences.availabilityPublic} onChange={(event) => setPayload({ ...payload, preferences: { ...payload.preferences, availabilityPublic: event.target.checked } })} /> <span><strong className="block">Disponibilités publiques</strong><small className="text-on-surface-variant">Les MJ voient seulement votre compatibilité avec un créneau.</small></span></label>
              <label className="mt-5 flex items-start gap-3 text-sm"><input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={payload.preferences.invitationNotifications} onChange={(event) => setPayload({ ...payload, preferences: { ...payload.preferences, invitationNotifications: event.target.checked } })} /> <span><strong className="block">Recevoir les invitations</strong><small className="text-on-surface-variant">Soyez informé lorsqu’un MJ vous invite.</small></span></label>
              <label className="mt-5 block text-sm font-semibold" htmlFor="experience">Niveau d’expérience<select className="mt-2 min-h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-primary" id="experience" value={payload.preferences.experienceLevel ?? ''} onChange={(event) => setPayload({ ...payload, preferences: { ...payload.preferences, experienceLevel: (event.target.value || null) as AvailabilityPayload['preferences']['experienceLevel'] } })}><option value="">À choisir</option><option value="BEGINNER">Débutant</option><option value="INTERMEDIATE">Intermédiaire</option><option value="VETERAN">Vétéran</option></select></label>
              <button className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </aside>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
