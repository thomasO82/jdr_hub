'use client'

import { Send, X } from 'lucide-react'
import { useState } from 'react'
import type { Invitation } from '@jdr-hub/shared'
import { createInvitationsApi } from '../../lib/invitations-api'

export function InvitationsPanel({ gameId, invitations, onChange }: { gameId: string; invitations: Invitation[]; onChange: (invitations: Invitation[]) => void }) {
  const [inviteeId, setInviteeId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [api] = useState(() => createInvitationsApi())

  async function invite(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    const invitation = await api.create(gameId, inviteeId.trim())
    setBusy(false)
    if (!invitation) { setMessage('L’invitation n’a pas pu être envoyée. Vérifiez l’identifiant puis réessayez.'); return }
    setInviteeId('')
    onChange([invitation, ...invitations])
    setMessage('Invitation envoyée. Elle restera valable sept jours.')
  }

  async function cancel(invitationId: string): Promise<void> {
    setBusy(true)
    setMessage(null)
    const invitation = await api.decide(invitationId, 'CANCELLED')
    setBusy(false)
    if (!invitation) { setMessage('L’invitation n’a pas pu être annulée. Réessayez.'); return }
    onChange(invitations.map((item) => item.id === invitation.id ? invitation : item))
    setMessage('Invitation annulée.')
  }

  const pending = invitations.filter((invitation) => invitation.status === 'PENDING')
  return <section aria-labelledby="invitations-title" className="grid gap-5" id="management-panel-invitations" role="tabpanel" tabIndex={0}><div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Recrutement</p><h2 className="m-0 mt-1 font-display text-2xl font-semibold" id="invitations-title">Inviter des joueurs</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">L’invitation est valable sept jours et ne révèle aucune donnée avant acceptation.</p></div><form className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface p-4 sm:flex-row sm:items-end" onSubmit={(event) => { void invite(event) }}><label className="grid flex-1 gap-2 text-sm font-semibold" htmlFor="invitee-id">Identifiant du joueur<input className="min-h-12 rounded-lg border border-outline px-4 font-body font-normal text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30" id="invitee-id" onChange={(event) => setInviteeId(event.target.value)} placeholder="UUID du joueur" required value={inviteeId} /></label><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={busy || inviteeId.trim().length === 0} type="submit"><Send aria-hidden="true" size={17} />Inviter</button></form>{message ? <p aria-live="polite" className="m-0 rounded-lg bg-primary-fixed/50 p-3 text-sm text-primary">{message}</p> : null}<div className="grid gap-3">{pending.map((invitation) => <article className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between" key={invitation.id}><div><p className="m-0 font-semibold">{invitation.inviteeName}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">En attente · expire le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))}</p></div><button className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-lg border border-outline-variant px-4 text-sm font-semibold text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto" disabled={busy} onClick={() => { void cancel(invitation.id) }} type="button"><X aria-hidden="true" size={17} />Annuler</button></article>)}</div>{pending.length === 0 ? <p className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">Aucune invitation en attente.</p> : null}</section>
}
