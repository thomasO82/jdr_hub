'use client'

import { Shield, UserRound, UserRoundMinus } from 'lucide-react'
import { useState } from 'react'
import type { GameMemberView } from '@jdr-hub/shared'
import { createMembersApi } from '../../lib/members-api'

export function RosterPanel({ gameId, members, onChange }: { gameId: string; members: GameMemberView[]; onChange: (members: GameMemberView[]) => void }) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [api] = useState(() => createMembersApi())

  async function remove(userId: string): Promise<void> {
    setBusyId(userId)
    setMessage(null)
    const success = await api.remove(gameId, userId)
    setBusyId(null)
    setConfirmId(null)
    if (!success) { setMessage('Le joueur n’a pas pu être retiré. Réessayez.'); return }
    onChange(members.filter((member) => member.userId !== userId))
    setMessage('Le joueur a été retiré du groupe.')
  }

  return <section aria-labelledby="roster-title" className="grid gap-4" id="management-panel-roster" role="tabpanel" tabIndex={0}><div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Composition</p><h2 className="m-0 mt-1 font-display text-2xl font-semibold" id="roster-title">Groupe de la partie</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">Le propriétaire est toujours conservé comme maître du jeu.</p></div>{message ? <p aria-live="polite" className="m-0 rounded-lg bg-primary-fixed/50 p-3 text-sm text-primary">{message}</p> : null}<div className="grid gap-3">{members.map((member) => <article className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/60 bg-surface p-4" key={member.userId}><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-primary">{member.role === 'GM' ? <Shield aria-hidden="true" size={19} /> : <UserRound aria-hidden="true" size={19} />}</span><div className="min-w-0"><p className="m-0 truncate font-semibold">{member.username}</p><p className="m-0 mt-1 font-label text-xs text-on-surface-variant">{member.role === 'GM' ? 'Maître du jeu' : 'Joueur'}</p></div></div>{member.role === 'PLAYER' ? <div>{confirmId === member.userId ? <div aria-label={`Confirmer le retrait de ${member.username}`} className="flex flex-wrap items-center justify-end gap-2" role="dialog"><span className="text-xs text-on-surface-variant">Retirer ce joueur ?</span><button className="min-h-10 rounded-lg bg-error px-3 text-xs font-semibold text-on-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" disabled={busyId === member.userId} onClick={() => { void remove(member.userId) }} type="button">Confirmer</button><button className="min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setConfirmId(null)} type="button">Annuler</button></div> : <button aria-label={`Retirer ${member.username}`} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-outline-variant px-3 text-sm font-semibold text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setConfirmId(member.userId)} type="button"><UserRoundMinus aria-hidden="true" size={17} />Retirer</button>}</div> : <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 font-label text-xs font-semibold text-primary"><Shield aria-hidden="true" size={14} />Propriétaire</span>}</article>)}</div>{members.length === 0 ? <p className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">Le groupe ne compte encore aucun joueur.</p> : null}</section>
}
