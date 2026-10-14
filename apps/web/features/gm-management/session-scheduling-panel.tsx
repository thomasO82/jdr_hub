'use client'

import React, { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock3, Plus, Trash2 } from 'lucide-react'
import type { DashboardSession, GameType, ProposalInput, SchedulingProposal } from '@jdr-hub/shared'
import { createSchedulingApi } from '../../lib/scheduling-api'

type SlotDraft = { startsAt: string; endsAt: string }

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))
}

function toIsoWindow(slot: SlotDraft): ProposalInput['slots'][number] {
  return { startsAt: new Date(slot.startsAt).toISOString(), endsAt: new Date(slot.endsAt).toISOString() }
}

function DateRangeFields({ slot, label, onChange }: { slot: SlotDraft; label: string; onChange: (slot: SlotDraft) => void }) {
  return <fieldset className="grid gap-3 rounded-xl border border-outline-variant/60 p-4 sm:grid-cols-2"><legend className="px-1 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</legend><label className="grid gap-1.5 text-sm font-semibold">Début<input className="min-h-12 rounded-lg border border-outline-variant bg-surface px-3 font-body font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onChange={(event) => onChange({ ...slot, startsAt: event.target.value })} required type="datetime-local" value={slot.startsAt} /></label><label className="grid gap-1.5 text-sm font-semibold">Fin<input className="min-h-12 rounded-lg border border-outline-variant bg-surface px-3 font-body font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onChange={(event) => onChange({ ...slot, endsAt: event.target.value })} required type="datetime-local" value={slot.endsAt} /></label></fieldset>
}

export function SessionSchedulingPanel({ gameId, gameType, nextSession, openProposalCount }: { gameId: string; gameType: GameType; nextSession: DashboardSession | null; openProposalCount: number }) {
  const [api] = useState(() => createSchedulingApi())
  const [proposals, setProposals] = useState<SchedulingProposal[] | null>(null)
  const [fixedSlot, setFixedSlot] = useState<SlotDraft>({ startsAt: '', endsAt: '' })
  const [proposalSlots, setProposalSlots] = useState<SlotDraft[]>([{ startsAt: '', endsAt: '' }])
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

  useEffect(() => { void refreshProposals() }, [refreshProposals])

  function beginRequest(): void {
    setBusy(true)
    setMessage(null)
    setCreatedSession(null)
    setError(null)
  }

  async function createFixedSession(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    beginRequest()
    try {
      const result = await api.createSession(gameId, { ...toIsoWindow(fixedSlot), notes: null })
      if (!result) {
        setError(gameType === 'ONE_SHOT' ? 'La séance n’a pas pu être planifiée. Vérifiez les horaires et la limite de trois séances du one-shot.' : 'La séance n’a pas pu être planifiée. Vérifiez les horaires puis réessayez.')
        return
      }
      setFixedSlot({ startsAt: '', endsAt: '' })
      setCreatedSession(result)
      setMessage(`Séance planifiée le ${formatDate(result.startsAt)}. Elle apparaîtra dans le planning des participants.`)
    } catch {
      setError('La séance n’a pas pu être planifiée. Vérifiez les horaires puis réessayez.')
    } finally { setBusy(false) }
  }

  async function createProposals(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    beginRequest()
    try {
      const result = await api.createProposals(gameId, proposalSlots.map(toIsoWindow))
      if (!result) {
        setError('Les créneaux n’ont pas pu être envoyés. Vérifiez les horaires puis réessayez.')
        return
      }
      setProposalSlots([{ startsAt: '', endsAt: '' }])
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
      if (!result) {
        setError('Ce créneau n’a pas pu être retenu. Actualisez la liste puis réessayez.')
        return
      }
      setCreatedSession(result)
      setMessage(`Séance planifiée le ${formatDate(result.startsAt)}. Elle apparaîtra dans le planning des participants.`)
      await refreshProposals()
    } finally { setBusy(false) }
  }

  const openProposals = proposals?.filter((proposal) => proposal.status === 'OPEN') ?? []
  const proposalCount = proposals === null ? openProposalCount : openProposals.length

  return <section aria-labelledby="sessions-title" className="grid gap-5" id="management-panel-sessions" role="tabpanel" tabIndex={0}>
    <div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Organisation</p><h2 className="m-0 mt-1 font-display text-2xl font-semibold" id="sessions-title">Séances</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">Planifiez une date directement ou laissez les joueurs choisir parmi plusieurs créneaux.</p></div>
    {message ? <div aria-live="polite" className="grid gap-2 rounded-lg bg-primary-fixed/50 p-3 pr-16 text-sm text-primary max-md:pr-20" role="status"><p className="m-0">{message}</p>{createdSession ? <Link className="inline-flex min-h-10 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/planning#session-${encodeURIComponent(createdSession.id)}`}>Ouvrir cette séance dans le planning</Link> : null}</div> : null}
    {error ? <p aria-live="polite" className="m-0 rounded-lg border border-error/30 bg-error-container p-3 pr-16 text-sm text-on-error-container max-md:pr-20" role="alert">{error}</p> : null}
    <div className="grid gap-5 lg:grid-cols-2">
      <form className="grid content-start gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5" onSubmit={(event) => { void createFixedSession(event) }}><div><h3 className="m-0 font-display text-xl font-semibold">Séance à date fixe</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">Les horaires sont affichés selon le fuseau de votre navigateur.{gameType === 'ONE_SHOT' ? ' Un one-shot peut comporter jusqu’à trois séances.' : ''}</p></div><DateRangeFields label="Date de la séance" onChange={setFixedSlot} slot={fixedSlot} /><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy} type="submit"><CalendarDays aria-hidden="true" size={17} />Planifier la séance</button></form>
      <form className="grid content-start gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5" onSubmit={(event) => { void createProposals(event) }}><div><h3 className="m-0 font-display text-xl font-semibold">Proposer des créneaux aux joueurs</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">Ajoutez de un à dix créneaux ; chaque durée doit être comprise entre 15 minutes et 24 heures.</p></div><div className="grid gap-3">{proposalSlots.map((slot, index) => <div className="relative" key={index}><DateRangeFields label={`Créneau ${index + 1}`} onChange={(value) => setProposalSlots((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} slot={slot} />{proposalSlots.length > 1 ? <button aria-label={`Supprimer le créneau ${index + 1}`} className="absolute right-2 top-1 min-h-10 rounded-lg px-2 text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" disabled={busy} onClick={() => setProposalSlots((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 aria-hidden="true" size={17} /></button> : null}</div>)}</div><div className="grid gap-2 sm:grid-cols-2"><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 font-semibold text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy || proposalSlots.length >= 10} onClick={() => setProposalSlots((current) => [...current, { startsAt: '', endsAt: '' }])} type="button"><Plus aria-hidden="true" size={17} />Ajouter un créneau</button><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-3 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy} type="submit"><Clock3 aria-hidden="true" size={17} />Envoyer aux joueurs</button></div></form>
    </div>
    <section aria-labelledby="proposals-title" className="grid gap-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="m-0 font-display text-xl font-semibold" id="proposals-title">Créneaux en attente</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">{proposalCount} créneau{proposalCount > 1 ? 'x' : ''} en attente d’une décision.</p></div>{proposals === null ? <p className="m-0 text-sm text-on-surface-variant" role="status">Chargement des propositions…</p> : null}</div>{openProposals.length > 0 ? <ul className="m-0 grid gap-3 p-0 sm:grid-cols-2">{openProposals.map((proposal) => <li className="list-none rounded-xl border border-outline-variant/60 bg-surface p-4" key={proposal.id}><p className="m-0 font-semibold">Début : {formatDate(proposal.startsAt)}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">Fin : {formatDate(proposal.endsAt)}</p><p className="m-0 mt-2 text-sm text-on-surface-variant">Oui : {proposal.votes.yes} · Peut-être : {proposal.votes.maybe} · Non : {proposal.votes.no}</p><button className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-on-primary hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" disabled={busy} onClick={() => { void selectProposal(proposal.id) }} type="button">Retenir ce créneau</button></li>)}</ul> : proposals?.length === 0 ? <p className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-sm text-on-surface-variant">Aucun créneau proposé pour le moment.</p> : null}</section>
    {nextSession ? <article className="rounded-xl border border-outline-variant/60 bg-surface p-5"><div className="flex items-start gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 text-primary" size={22} /><div><h3 className="m-0 font-display text-xl font-semibold">Prochaine séance</h3><p className="m-0 mt-1 inline-flex items-center gap-2 text-sm text-on-surface-variant"><Clock3 aria-hidden="true" size={16} />{formatDate(nextSession.startsAt)}</p></div></div><Link className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-primary px-4 font-semibold text-on-primary no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/planning#session-${encodeURIComponent(nextSession.id)}`}>Ouvrir le planning</Link></article> : null}
  </section>
}
