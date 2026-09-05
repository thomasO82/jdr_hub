'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { AppShell } from '../layout/app-shell'

export function NewGameView() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        system: form.get('system'),
        description: form.get('description'),
        type: form.get('type'),
        maxPlayers: Number(form.get('maxPlayers')),
        visibility: form.get('visibility'),
        tags: String(form.get('tags') ?? '').split(',').map((tag) => tag.trim()).filter(Boolean),
      }),
    })
    setPending(false)
    if (!response.ok) {
      setError('Impossible de créer la partie. Connectez-vous puis réessayez.')
      return
    }
    window.location.assign('/parties')
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-background px-5 py-6 font-body text-on-surface md:px-6 md:py-10 lg:px-10">
        <section className="mx-auto max-w-3xl" aria-labelledby="new-game-title">
          <p className="m-0 mb-2 font-label text-xs font-bold uppercase tracking-wider text-primary">Nouvelle aventure</p>
          <h1 className="m-0 font-display text-4xl font-semibold tracking-tight" id="new-game-title">Créer une partie</h1>
          <form className="mt-8 grid gap-6 rounded-2xl border border-surface-container-highest bg-surface p-6 shadow-sm md:p-8" onSubmit={submit}>
            <label className="grid gap-2 font-body text-sm font-semibold">Titre<input className="min-h-11 rounded-lg border border-outline-variant bg-surface px-3.5 font-body font-normal outline-none transition focus:border-primary focus:outline-2 focus:outline-primary/30" name="title" required maxLength={160} /></label>
            <label className="grid gap-2 font-body text-sm font-semibold">Système<input className="min-h-11 rounded-lg border border-outline-variant bg-surface px-3.5 font-body font-normal outline-none transition focus:border-primary focus:outline-2 focus:outline-primary/30" name="system" required maxLength={100} /></label>
            <label className="grid gap-2 font-body text-sm font-semibold">Description<textarea className="min-h-32 rounded-lg border border-outline-variant bg-surface p-3.5 font-body font-normal outline-none transition focus:border-primary focus:outline-2 focus:outline-primary/30" name="description" required maxLength={10000} rows={6} /></label>
            <label className="grid gap-2 font-body text-sm font-semibold">Type<select className="min-h-11 rounded-lg border border-outline-variant bg-surface px-3.5 font-body font-normal outline-none transition focus:border-primary focus:outline-2 focus:outline-primary/30" name="type" defaultValue="ONE_SHOT"><option value="ONE_SHOT">One-shot</option><option value="CAMPAIGN">Campagne</option></select></label>
            <label className="grid gap-2 font-body text-sm font-semibold">Nombre maximum de joueurs<input className="min-h-11 rounded-lg border border-outline-variant bg-surface px-3.5 font-body font-normal outline-none transition focus:border-primary focus:outline-2 focus:outline-primary/30" name="maxPlayers" type="number" min="1" max="12" defaultValue="4" required /></label>
            <label className="grid gap-2 font-body text-sm font-semibold">Visibilité<select className="min-h-11 rounded-lg border border-outline-variant bg-surface px-3.5 font-body font-normal outline-none transition focus:border-primary focus:outline-2 focus:outline-primary/30" name="visibility" defaultValue="PUBLIC"><option value="PUBLIC">Publique</option><option value="PRIVATE">Privée</option></select></label>
            <label className="grid gap-2 font-body text-sm font-semibold">Tags séparés par des virgules<input className="min-h-11 rounded-lg border border-outline-variant bg-surface px-3.5 font-body font-normal outline-none transition focus:border-primary focus:outline-2 focus:outline-primary/30" name="tags" placeholder="fantasy, débutant" /></label>
            {error && <p className="m-0 rounded-lg bg-red-50 p-3 font-body text-sm text-error" role="alert">{error}</p>}
            <div className="flex items-center gap-3 pt-1 max-sm:flex-col max-sm:items-stretch">
              <button className="min-h-11 rounded-lg border-0 bg-primary px-5 font-body font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={pending}>{pending ? 'Création…' : 'Créer la partie'}</button>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary-fixed-dim bg-surface px-5 font-body font-semibold text-primary no-underline transition-colors hover:bg-primary-fixed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/parties">Annuler</Link>
            </div>
          </form>
        </section>
      </main>
    </AppShell>
  )
}
