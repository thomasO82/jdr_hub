'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { createApplicationsApi } from '../../lib/applications-api'
import type { Application } from '@jdr-hub/shared'
import { ApplicationStatus } from './application-status'
import { getApplicationView } from './application-state'

export function ApplicationForm({ gameId }: { gameId: string }) {
  const [message, setMessage] = useState('')
  const [application, setApplication] = useState<Application | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [checkingApplication, setCheckingApplication] = useState(true)
  const [canApply, setCanApply] = useState(true)


  useEffect(() => {
    let active = true
    void createApplicationsApi().getMineForGame(gameId).then((state) => {
      if (!active) return
      setApplication(state?.application ?? null)
      setCanApply(state?.canApply ?? true)
      setCheckingApplication(false)
    })
    return () => { active = false }
  }, [gameId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await createApplicationsApi().submit(gameId, message.trim() || undefined)
    setPending(false)
    if (!result) { setError('Impossible de déposer la candidature. Connectez-vous ou réessayez plus tard.'); return }
    setApplication(result)
  }

  if (checkingApplication) return <p className="mt-4 rounded-lg border border-primary-fixed-dim bg-primary-fixed/40 p-4 text-left font-body text-sm text-on-surface-variant" role="status">Vérification de votre candidature…</p>
  const view = getApplicationView({ canApply, application })
  if (view === 'STATUS' && application) return <ApplicationStatus application={application} />
  if (view === 'HIDDEN') return null

  return (
    <form className="mt-4 grid gap-3 text-left" onSubmit={submit}>
      <label className="grid gap-1.5 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="application-message">Message au MJ <span className="font-normal normal-case tracking-normal">(facultatif)</span></label>
      <textarea className="min-h-24 resize-y rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="application-message" maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder="Présentez brièvement votre envie de rejoindre la partie…" value={message} />
      <button aria-label="Postuler pour rejoindre" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-0 bg-primary px-4 font-body font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit"><Send aria-hidden="true" size={17} />{pending ? 'Envoi…' : 'Postuler pour rejoindre'}</button>
      {error && <p className="m-0 text-sm text-error" role="alert">{error}</p>}
    </form>
  )
}
