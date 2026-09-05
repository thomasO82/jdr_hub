'use client'

import { useEffect, useState } from 'react'
import type { SchedulingProposal } from '@jdr-hub/shared'
import { AppShell } from '../../../../features/layout/app-shell'
import { ProposalVoteView } from '../../../../features/scheduling/proposal-vote-view'
import { createSchedulingApi } from '../../../../lib/scheduling-api'

export default function ProposalVotePage({ params }: { params: Promise<{ id: string }> }) {
  const [proposals, setProposals] = useState<SchedulingProposal[] | null>(null)
  const [gameId, setGameId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { void params.then(({ id }) => { setGameId(id); return createSchedulingApi().listProposals(id).then((data) => { if (!data) setFailed(true); else setProposals(data) }) }) }, [params])
  if (failed) return <AppShell active="Games"><p className="p-8 text-on-surface-variant" role="alert">Le vote est indisponible. Réessayez dans un instant.</p></AppShell>
  if (!proposals || !gameId) return <AppShell active="Games"><p className="p-8 text-on-surface-variant" role="status">Chargement du vote…</p></AppShell>
  return <ProposalVoteView gameId={gameId} initialProposals={proposals} />
}
