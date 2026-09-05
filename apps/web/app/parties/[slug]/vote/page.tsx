'use client'

import { useEffect, useState } from 'react'
import type { SchedulingProposal } from '@jdr-hub/shared'
import { AppShell } from '../../../../features/layout/app-shell'
import { ProposalVoteView } from '../../../../features/scheduling/proposal-vote-view'
import { createSchedulingApi } from '../../../../lib/scheduling-api'

export default function ProposalVotePage({ params }: { params: Promise<{ slug: string }> }) {
  const [proposals, setProposals] = useState<SchedulingProposal[] | null>(null)
  const [gameSlug, setGameSlug] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { void params.then(({ slug }) => { setGameSlug(slug); return createSchedulingApi().listProposals(slug).then((data) => { if (!data) setFailed(true); else setProposals(data) }) }) }, [params])
  if (failed) return <AppShell active="Games"><p className="p-8 text-on-surface-variant" role="alert">Le vote est indisponible. Réessayez dans un instant.</p></AppShell>
  if (!proposals || !gameSlug) return <AppShell active="Games"><p className="p-8 text-on-surface-variant" role="status">Chargement du vote…</p></AppShell>
  return <ProposalVoteView gameId={gameSlug} initialProposals={proposals} />
}
