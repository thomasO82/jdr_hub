'use client'

import React, { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock3, Pencil, Plus, Trash2 } from 'lucide-react'
import type { DashboardSession, GameType, PlanningPage, ProposalInput, SchedulingProposal, SessionUpdateInput } from '@jdr-hub/shared'
import { createSchedulingApi } from '../../lib/scheduling-api'
import { sessionWindowValidationMessage } from './session-scheduling-validation'
import { canManageSession, groupProposalRounds, proposalRoundLabel } from './session-scheduling-view'

type SlotDraft = { startsAt: string; endsAt: string }
type SchedulingMode = 'fixed' | 'proposals'
type ManagedSession = PlanningPage['items'][number]

const emptySlot = (): SlotDraft => ({ startsAt: '', endsAt: '' })

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))
}

function toIsoWindow(slot: SlotDraft): SessionUpdateInput {
  return { startsAt: new Date(slot.startsAt).toISOString(), endsAt: new Date(slot.endsAt).toISOString() }
}

function toLocalInput(value: string): string {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function statusLabel(status: ManagedSession['status']): string {
  switch (status) {
    case 'SCHEDULED': return 'Planifiée'
    case 'COMPLETED': return 'Terminée'
    case 'CANCELLED': return 'Annulée'
    case 'PROPOSED': return 'À confirmer'
  }
}

function DateRangeFields({ slot, label, onChange }: { slot: SlotDraft; label: string; onChange: (slot: SlotDraft) => void }) {
  return <fieldset className="grid gap-3 rounded-xl border border-outline-variant/60 p-4 sm:grid-cols-2"><legend className="px-1 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</legend><label className="grid gap-1.5 text-sm font-semibold">Début<input className="min-h-12 rounded-lg border border-outline-variant bg-surface px-3 font-body font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onChange={(event) => onChange({ ...slot, startsAt: event.target.value })} required type="datetime-local" value={slot.startsAt} /></label><label className="grid gap-1.5 text-sm font-semibold">Fin<input className="min-h-12 rounded-lg border border-outline-variant bg-surface px-3 font-body font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onChange={(event) => onChange({ ...slot, endsAt: event.target.value })} required type="datetime-local" value={slot.endsAt} /></label></fieldset>
}

export function SessionSchedulingPanel({ gameId, gameType, nextSession, openProposalCount }: { gameId: string; gameType: GameType; nextSession: DashboardSession | null; openProposalCount: number }) {
  const [api] = useState(() => createSchedulingApi())
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode | null>(null)
  const [proposals, setProposals] = useState<SchedulingProposal[] | null>(null)
  const [sessions, setSessions] = useState<ManagedSession[] | null>(null)
  const [fixedSlot, setFixedSlot] = useState<SlotDraft>(emptySlot)
  const [proposalSlots, setProposalSlots] = useState<SlotDraft[]>([emptySlot()])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editSlot, setEditSlot] = useState<SlotDraft>(emptySlot)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [createdSession, setCreatedSession] = useState<DashboardSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshProposals = useCallback(async (): Promise<void> => {
    const result = await api.listProposals(gameId)
    if (result) setProposals(result)
    else {
      setProposals([])
      setError('Les créneaux ne sont pas disponibles. Actualisez la page puis réessayez.')
    }
  }, [api, gameId])

  const refreshSessions = useCallback(async (): Promise<void> => {
    const result = await api.listGameSessions(gameId)
    if (result) setSessions(result)
    else {
      setSessions([])
      setError('L’historique des séances est indisponible. Actualisez la page puis réessayez.')
    }
  }, [api, gameId])

  useEffect(() => { void Promise.all([refreshProposals(), refreshSessions()]) }, [refreshProposals, refreshSessions])

  function beginRequest(): void {
    setBusy(true)
    setMessage(null)
    setCreatedSession(null)
    setError(null)
  }

  async function createFixedSession(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const window = toIsoWindow(fixedSlot)
    const validationMessage = sessionWindowValidationMessage(window)
    if (validationMessage) { setError(validationMessage); return }
    beginRequest()
    try {
      const result = await api.createSession(gameId, { ...window, notes: null })
      if (!result) {
        setError(gameType === 'ONE_SHOT' ? 'La séance n’a pas pu être planifiée. Vérifiez les horaires et la limite de trois séances du one-shot.' : 'La séance n’a pas pu être planifiée. Vérifiez les horaires puis réessayez.')
        return
      }
      setFixedSlot(emptySlot())
      setCreatedSession(result)
      setMessage(`Séance planifiée le ${formatDate(result.startsAt)}. Elle apparaîtra dans le planning des participants.`)
      await refreshSessions()
    } catch {
      setError('La séance n’a pas pu être planifiée. Vérifiez les horaires puis réessayez.')
    } finally { setBusy(false) }
  }

  async function createProposals(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const slots = proposalSlots.map(toIsoWindow)
    const validationMessage = slots.map(sessionWindowValidationMessage).find((item) => item !== null)
    if (validationMessage) { setError(validationMessage); return }
    beginRequest()
    try {
      const result = await api.createProposals(gameId, slots)
      if (!result) { setError('Les créneaux n’ont pas pu être envoyés. Vérifiez les horaires puis réessayez.'); return }
      setProposalSlots([emptySlot()])
      setProposals(result)
      setMessage('Créneaux proposés. Les joueurs peuvent maintenant voter depuis leur tableau de bord.')
    } catch {
      setError('Les créneaux n’ont pas pu être envoyés. Vérifiez les horaires puis réessayez.')
    } finally { setBusy(false) }
  }

  async function selectProposal(proposalId: string): Promise<void> {
    beginRequest()
    try {
      const result = await api.createSession(gameId, { proposalId })
      if (!result) { setError('Ce créneau n’a pas pu être retenu. Actualisez la liste puis réessayez.'); return }
      setCreatedSession(result)
      setMessage(`Séance planifiée le ${formatDate(result.startsAt)}. Elle apparaîtra dans le planning des participants.`)
      await Promise.all([refreshProposals(), refreshSessions()])
    } finally { setBusy(false) }
  }

  function beginEdit(session: ManagedSession): void {
    setEditingSessionId(session.id)
    setEditSlot({ startsAt: toLocalInput(session.startsAt), endsAt: toLocalInput(session.endsAt) })
    setError(null)
    setMessage(null)
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!editingSessionId) return
    const window = toIsoWindow(editSlot)
    const validationMessage = sessionWindowValidationMessage(window)
    if (validationMessage) { setError(validationMessage); return }
    beginRequest()
    try {
      const result = await api.updateSession(gameId, editingSessionId, window)
      if (!result) { setError('La séance n’a pas pu être modifiée. Vérifiez les horaires puis réessayez.'); return }
      setEditingSessionId(null)
      setMessage(`Séance déplacée au ${formatDate(result.startsAt)}.`)
      await refreshSessions()
    } finally { setBusy(false) }
  }

  async function cancelSession(session: ManagedSession): Promise<void> {
    if (!window.confirm(`Annuler la séance du ${formatDate(session.startsAt)} ? Elle sera retirée du planning des joueurs, mais restera visible dans l’historique.`)) return
    beginRequest()
    try {
      const result = await api.cancelSession(gameId, session.id)
      if (!result) { setError('La séance n’a pas pu être annulée. Actualisez la page puis réessayez.'); return }
      setEditingSessionId(null)
      setMessage('Séance annulée. Elle a été retirée du planning ; les propositions et les votes restent dans l’historique.')
      await Promise.all([refreshSessions(), refreshProposals()])
    } finally { setBusy(false) }
  }

  const openProposals = proposals?.filter((proposal) => proposal.roundStatus === 'OPEN' && proposal.status === 'OPEN') ?? []
  const proposalCount = proposals === null ? openProposalCount : openProposals.length
  const proposalRounds = proposals ? groupProposalRounds(proposals) : []

  return <section aria-labelledby="sessions-title" className="grid gap-5" id="management-panel-sessions" role="tabpanel" tabIndex={0}>
    <div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Organisation</p><h2 className="m-0 mt-1 font-display text-2xl font-semibold" id="sessions-title">Séances</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">Planifiez une date directement ou laissez les joueurs choisir parmi plusieurs créneaux.</p></div>
    {message ? <div aria-live="polite" className="grid gap-2 rounded-lg bg-primary-fixed/50 p-3 pr-16 text-sm text-primary max-md:pr-20" role="status"><p className="m-0">{message}</p>{createdSession ? <Link className="inline-flex min-h-10 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/planning#session-${encodeURIComponent(createdSession.id)}`}>Ouvrir cette séance dans le planning</Link> : null}</div> : null}
    {error ? <p aria-live="polite" className="m-0 rounded-lg border border-error/30 bg-error-container p-3 pr-16 text-sm text-on-error-container max-md:pr-20" role="alert">{error}</p> : null}
    {schedulingMode === null ? <div aria-labelledby="scheduling-mode-title" className="grid gap-3 sm:grid-cols-2">
      <h3 className="sr-only" id="scheduling-mode-title">Choisir le mode de planification</h3>
      <button className="grid min-h-28 content-center justify-items-center gap-2 rounded-2xl border border-outline-variant/60 bg-surface p-5 text-center font-semibold transition-colors hover:border-primary hover:bg-primary-fixed/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setSchedulingMode('fixed')} type="button"><CalendarDays aria-hidden="true" className="text-primary" size={22} />Date fixe</button>
      <button className="grid min-h-28 content-center justify-items-center gap-2 rounded-2xl border border-outline-variant/60 bg-surface p-5 text-center font-semibold transition-colors hover:border-primary hover:bg-primary-fixed/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setSchedulingMode('proposals')} type="button"><Clock3 aria-hidden="true" className="text-primary" size={22} />Proposer des créneaux</button>
    </div> : <div className="grid justify-items-start gap-3">
      <button className="min-h-11 rounded-lg px-3 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setSchedulingMode(null)} type="button">Changer de mode</button>
      {schedulingMode === 'fixed' ? <form className="grid w-full content-start gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5" onSubmit={(event) => { void createFixedSession(event) }}><div><h3 className="m-0 font-display text-xl font-semibold">Séance à date fixe</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">Les horaires sont affichés selon le fuseau de votre navigateur.{gameType === 'ONE_SHOT' ? ' Un one-shot peut comporter jusqu’à trois séances.' : ''}</p></div><DateRangeFields label="Date de la séance" onChange={setFixedSlot} slot={fixedSlot} /><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy} type="submit"><CalendarDays aria-hidden="true" size={17} />Planifier la séance</button></form> : <form className="grid w-full content-start gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5" onSubmit={(event) => { void createProposals(event) }}><div><h3 className="m-0 font-display text-xl font-semibold">Proposer des créneaux aux joueurs</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">Ajoutez de un à dix créneaux ; chaque durée doit être comprise entre 15 minutes et 24 heures.</p></div><div className="grid gap-3">{proposalSlots.map((slot, index) => <div className="relative" key={index}><DateRangeFields label={`Créneau ${index + 1}`} onChange={(value) => setProposalSlots((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} slot={slot} />{proposalSlots.length > 1 ? <button aria-label={`Supprimer le créneau ${index + 1}`} className="absolute right-2 top-1 min-h-10 rounded-lg px-2 text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" disabled={busy} onClick={() => setProposalSlots((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 aria-hidden="true" size={17} /></button> : null}</div>)}</div><div className="grid gap-2 sm:grid-cols-2"><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 font-semibold text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy || proposalSlots.length >= 10} onClick={() => setProposalSlots((current) => [...current, emptySlot()])} type="button"><Plus aria-hidden="true" size={17} />Ajouter un créneau</button><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-3 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy || openProposals.length > 0} type="submit"><Clock3 aria-hidden="true" size={17} />Envoyer aux joueurs</button></div>{openProposals.length > 0 ? <p className="m-0 text-sm text-on-surface-variant">Un vote est déjà en cours. Attendez qu’un créneau soit retenu avant d’en lancer un nouveau.</p> : null}</form>}
    </div>}
    <section aria-labelledby="proposals-title" className="grid gap-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="m-0 font-display text-xl font-semibold" id="proposals-title">Propositions de créneaux</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">{proposalCount} créneau{proposalCount > 1 ? 'x' : ''} en attente d’une décision.</p></div>{proposals === null ? <p className="m-0 text-sm text-on-surface-variant" role="status">Chargement des propositions…</p> : null}</div>{proposalRounds.length ? <div className="grid gap-3">{proposalRounds.map((round) => <section aria-label={`Tour de vote : ${proposalRoundLabel(round.status)}`} className="grid gap-3 rounded-xl border border-outline-variant/60 bg-surface p-4" key={round.roundId}><h4 className="m-0 font-semibold">{proposalRoundLabel(round.status)}</h4><ul className="m-0 grid gap-3 p-0 sm:grid-cols-2">{round.proposals.map((proposal) => <li className="list-none rounded-xl border border-outline-variant/50 p-4" key={proposal.id}><p className="m-0 font-semibold">Début : {formatDate(proposal.startsAt)}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">Fin : {formatDate(proposal.endsAt)}</p><p className="m-0 mt-2 text-sm text-on-surface-variant">Oui : {proposal.votes.yes} · Peut-être : {proposal.votes.maybe} · Non : {proposal.votes.no}</p>{proposal.status === 'OPEN' && proposal.roundStatus === 'OPEN' ? <button className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-on-primary hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy} onClick={() => { void selectProposal(proposal.id) }} type="button">Retenir ce créneau</button> : <p className="m-0 mt-3 text-sm font-semibold text-on-surface-variant">{proposal.status === 'SELECTED' ? 'Créneau retenu' : proposal.status === 'CLOSED' ? 'Autre créneau retenu' : 'Vote clos'}</p>}</li>)}</ul></section>)}</div> : proposals !== null ? <p className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-sm text-on-surface-variant">Aucun créneau proposé pour le moment.</p> : null}</section>
    <section aria-labelledby="session-history-title" className="grid gap-3"><div><h3 className="m-0 font-display text-xl font-semibold" id="session-history-title">Séances planifiées et historique</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">Les séances annulées restent consultables ici ; elles ne figurent plus au planning des joueurs.</p></div>{sessions === null ? <p className="m-0 text-sm text-on-surface-variant" role="status">Chargement des séances…</p> : sessions.length ? <ul className="m-0 grid gap-3 p-0">{sessions.map((session) => <li className="grid gap-3 rounded-xl border border-outline-variant/60 bg-surface p-4" key={session.id}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="m-0 font-semibold">{formatDate(session.startsAt)}</h4><span className="rounded-full bg-primary-fixed px-3 py-1 font-label text-xs font-semibold text-primary">{statusLabel(session.status)}</span></div><p className="m-0 text-sm text-on-surface-variant">Fin : {formatDate(session.endsAt)}</p>{editingSessionId === session.id ? <form className="grid gap-3" onSubmit={(event) => { void saveEdit(event) }}><DateRangeFields label="Nouveaux horaires" onChange={setEditSlot} slot={editSlot} /><div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-on-primary disabled:opacity-60" disabled={busy} type="submit">Enregistrer</button><button className="min-h-11 rounded-lg px-4 font-semibold text-primary underline disabled:opacity-60" disabled={busy} onClick={() => setEditingSessionId(null)} type="button">Abandonner</button></div></form> : canManageSession(session.status) ? <div className="flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant px-4 font-semibold text-primary hover:bg-primary-fixed/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy} onClick={() => beginEdit(session)} type="button"><Pencil aria-hidden="true" size={16} />Modifier les horaires</button><button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-error/40 px-4 font-semibold text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy} onClick={() => { void cancelSession(session) }} type="button"><Trash2 aria-hidden="true" size={16} />Annuler la séance</button></div> : null}</li>)}</ul> : <p className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-sm text-on-surface-variant">Aucune séance planifiée.</p>}</section>
    {nextSession ? <article className="rounded-xl border border-outline-variant/60 bg-surface p-5"><div className="flex items-start gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 text-primary" size={22} /><div><h3 className="m-0 font-display text-xl font-semibold">Prochaine séance</h3><p className="m-0 mt-1 inline-flex items-center gap-2 text-sm text-on-surface-variant"><Clock3 aria-hidden="true" size={16} />{formatDate(nextSession.startsAt)}</p></div></div><Link className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-primary px-4 font-semibold text-on-primary no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/planning#session-${encodeURIComponent(nextSession.id)}`}>Ouvrir le planning</Link></article> : null}
  </section>
}
