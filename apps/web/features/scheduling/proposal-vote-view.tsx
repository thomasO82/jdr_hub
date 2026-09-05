'use client'

import { useState } from 'react'
import type { SchedulingProposal, VoteValue } from '@jdr-hub/shared'
import { AppShell } from '../layout/app-shell'
import { createSchedulingApi } from '../../lib/scheduling-api'
import { ProposalCard } from './proposal-card'
import { ProposalMatrix } from './proposal-matrix'

export function ProposalVoteView({ gameId, initialProposals, title = 'Vote de Créneaux' }: { gameId: string; initialProposals: SchedulingProposal[]; title?: string }) {
  const [proposals, setProposals] = useState(initialProposals)
  const [selected, setSelected] = useState<Record<string, VoteValue | undefined>>(() => Object.fromEntries(initialProposals.map((proposal) => [proposal.id, proposal.userVote ?? undefined])))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  function choose(proposalId: string, vote: VoteValue) { setSelected((current) => ({ ...current, [proposalId]: vote })) }
  async function submit() {
    setError(null); setSaving(true)
    try {
      let next = proposals
      for (const proposal of proposals) {
        const vote = selected[proposal.id]
        if (vote && proposal.userVote === null) {
          const updated = await createSchedulingApi().vote(proposal.id, vote)
          if (!updated) { setError('Votre vote n’a pas pu être enregistré. Réessayez.'); return }
          next = updated
        }
      }
      setProposals(next)
    } finally { setSaving(false) }
  }
  return <AppShell active="Games"><main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10"><section className="mx-auto max-w-6xl" aria-labelledby="vote-title"><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Partie en cours</p><h1 className="m-0 mt-2 font-display text-4xl font-semibold tracking-tight" id="vote-title">{title}</h1><p className="m-0 mt-2 text-on-surface-variant">Choisissez les créneaux qui vous conviennent.</p><div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><section><h2 className="m-0 font-display text-2xl font-semibold">Créneaux Proposés</h2><div className="mt-4"><ProposalMatrix proposals={proposals} selected={selected} onSelect={choose} /><div className="grid gap-4 md:hidden">{proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} selected={selected[proposal.id]} onSelect={(vote) => choose(proposal.id, vote)} />)}</div></div>{error && <p className="mt-4 rounded-lg border border-error/30 bg-error-container p-3 text-sm text-on-error-container" role="alert">{error}</p>}<button className="mt-5 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary shadow-sm hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-primary" disabled={saving || proposals.every((proposal) => proposal.userVote !== null)} onClick={() => void submit()} type="button">{saving ? 'Enregistrement…' : 'Confirmer mon vote'}</button></section><aside className="h-fit rounded-xl border border-outline-variant/40 bg-surface p-5 shadow-sm"><h2 className="m-0 font-display text-xl font-semibold">Résumé des votes</h2><div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full w-3/4 rounded-full bg-primary" /></div><p className="m-0 mt-3 text-sm text-on-surface-variant">{proposals.filter((proposal) => proposal.userVote !== null).length} / {proposals.length} créneaux votés</p></aside></div></section></main></AppShell>
}

