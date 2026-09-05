'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import styles from './games-view.module.css'

export function NewGameView() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null)
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/games', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: form.get('title'), system: form.get('system'), description: form.get('description'), type: form.get('type'), maxPlayers: Number(form.get('maxPlayers')), visibility: form.get('visibility'), tags: String(form.get('tags') ?? '').split(',').map((tag) => tag.trim()).filter(Boolean) }) })
    setPending(false)
    if (!response.ok) { setError('Impossible de créer la partie. Connectez-vous puis réessayez.'); return }
    window.location.assign('/parties')
  }
  return <main className={styles.page}><section className={styles.shell} aria-labelledby="new-game-title"><p className={styles.eyebrow}>Nouvelle aventure</p><h1 className={styles.title} id="new-game-title">Créer une partie</h1><form className={styles.card} onSubmit={submit}><label>Titre<input className={styles.input} name="title" required maxLength={160} /></label><label>Système<input className={styles.input} name="system" required maxLength={100} /></label><label>Description<textarea className={styles.input} name="description" required maxLength={10000} rows={6} /></label><label>Type<select className={styles.select} name="type" defaultValue="ONE_SHOT"><option value="ONE_SHOT">One-shot</option><option value="CAMPAIGN">Campagne</option></select></label><label>Nombre maximum de joueurs<input className={styles.input} name="maxPlayers" type="number" min="1" max="12" defaultValue="4" required /></label><label>Visibilité<select className={styles.select} name="visibility" defaultValue="PUBLIC"><option value="PUBLIC">Publique</option><option value="PRIVATE">Privée</option></select></label><label>Tags séparés par des virgules<input className={styles.input} name="tags" placeholder="fantasy, débutant" /></label>{error && <p role="alert">{error}</p>}<button className={styles.primary} type="submit" disabled={pending}>{pending ? 'Création…' : 'Créer la partie'}</button><Link href="/parties">Annuler</Link></form></section></main>
}
