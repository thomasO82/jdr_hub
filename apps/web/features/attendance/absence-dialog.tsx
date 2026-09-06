'use client'

import { useEffect, useState } from 'react'
import type { PlanningSession } from '@jdr-hub/shared'
import { ABSENCE_ERROR, createAttendanceApi } from '../../lib/attendance-api'

type AbsenceDialogProps = {
  session: PlanningSession | null
  open: boolean
  onClose: () => void
}

function sessionLabel(session: PlanningSession): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(session.startsAt))
}

export function AbsenceDialog({ session, open, onClose }: AbsenceDialogProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [api] = useState(() => createAttendanceApi())

  useEffect(() => {
    if (open) setStatus('idle')
  }, [open, session?.id])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && status !== 'submitting') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open, status])

  if (!open || !session) return null
  const activeSession = session

  async function submit(): Promise<void> {
    setStatus('submitting')
    try {
      await api.reportAbsence(activeSession.id)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return <div aria-hidden="false" className="fixed inset-0 z-40 grid place-items-center bg-on-surface/45 px-4 py-8" onMouseDown={(event) => { if (event.target === event.currentTarget && status !== 'submitting') onClose() }}>
    <section aria-describedby="absence-dialog-description" aria-labelledby="absence-dialog-title" aria-modal="true" className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface p-6 shadow-xl" role="dialog">
      {status === 'success' ? <div className="grid gap-4 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-fixed text-primary">✓</div><div><h2 className="m-0 font-display text-2xl font-semibold" id="absence-dialog-title">Absence signalée</h2><p className="m-0 mt-2 text-sm leading-6 text-on-surface-variant">Le MJ a été prévenu dans JDR Hub et recevra un message privé Discord.</p></div><button className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={onClose} type="button">Fermer</button></div> : <div className="grid gap-5"><div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Prévenir le MJ</p><h2 className="m-0 mt-2 font-display text-2xl font-semibold" id="absence-dialog-title">Signaler une absence</h2><p className="m-0 mt-3 text-sm leading-6 text-on-surface-variant" id="absence-dialog-description">Confirmez votre absence pour « {activeSession.gameTitle} », prévue le {sessionLabel(activeSession)}. Le MJ sera informé automatiquement.</p></div>{status === 'error' ? <p className="m-0 rounded-lg border border-error/30 bg-error/5 px-3 py-3 text-sm text-error" role="alert">{ABSENCE_ERROR}</p> : null}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-12 rounded-xl border border-outline-variant px-5 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" disabled={status === 'submitting'} onClick={onClose} type="button">Annuler</button><button className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={status === 'submitting'} onClick={() => { void submit() }} type="button">{status === 'submitting' ? 'Envoi…' : 'Confirmer l’absence'}</button></div></div>}
    </section>
  </div>
}
