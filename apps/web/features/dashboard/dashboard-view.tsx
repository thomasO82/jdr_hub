'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Dices, ListChecks, Sparkles, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DashboardGame, DashboardView as DashboardData, SchedulingAction } from '@jdr-hub/shared'
import { createDashboardApi } from '../../lib/dashboard-api'
import { AppShell } from '../layout/app-shell'
import { DashboardBlock, DashboardLoading } from './dashboard-block'

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(status: DashboardGame['status']): string {
  return status === 'ACTIVE' ? 'En cours' : status === 'OPEN' ? 'Ouverte' : status
}

function actionLabel(action: SchedulingAction): string {
  return action.kind === 'VOTE' ? 'Vote à compléter' : 'Séance à préparer'
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return <main className="min-h-screen px-5 pb-28 pt-24 md:px-8 md:pt-10 lg:px-10" aria-labelledby="dashboard-error-title"><section className="mx-auto grid max-w-3xl gap-4 rounded-2xl border border-error/30 bg-surface p-8 text-center shadow-sm"><h1 className="m-0 font-display text-3xl font-semibold" id="dashboard-error-title">Votre tableau de bord est indisponible</h1><p className="m-0 text-on-surface-variant">Réessayez dans quelques instants ou reconnectez-vous pour poursuivre.</p><div className="flex flex-col justify-center gap-3 sm:flex-row"><button className="min-h-12 rounded-lg bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={onRetry} type="button">Réessayer</button><Link className="inline-flex min-h-12 items-center justify-center rounded-lg border border-outline-variant px-5 font-semibold text-primary no-underline hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/connexion">Se connecter</Link></div></section></main>
}

function ActiveGames({ games }: { games: DashboardGame[] }) {
  return <div className="grid gap-3">{games.map((game) => <article className="rounded-lg border border-outline-variant/60 bg-background p-4" key={game.id}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-fixed text-primary"><Dices aria-hidden="true" size={20} /></span><div className="min-w-0"><h3 className="m-0 truncate font-display text-lg font-semibold">{game.title}</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">{game.system} · {game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</p></div></div><span className="whitespace-nowrap rounded-full bg-primary-fixed px-2.5 py-1 font-label text-xs font-semibold text-primary">{statusLabel(game.status)}</span></div><div className="mt-4 flex items-center justify-between gap-3 text-sm text-on-surface-variant"><span className="inline-flex items-center gap-1.5"><UsersRound aria-hidden="true" size={16} />{game.activePlayers}/{game.maxPlayers} joueurs</span>{game.role === 'GM' ? <Link className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/gestion/parties/${encodeURIComponent(game.id)}`}>Gérer <ArrowRight aria-hidden="true" size={15} /></Link> : null}</div></article>)}</div>
}

function Summary({ data }: { data: { pending: number; accepted: number; rejected: number } }) {
  return <dl className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-background p-3"><dt className="font-label text-xs text-on-surface-variant">En attente</dt><dd className="m-0 mt-1 font-display text-2xl font-semibold text-primary">{data.pending}</dd></div><div className="rounded-lg bg-background p-3"><dt className="font-label text-xs text-on-surface-variant">Acceptées</dt><dd className="m-0 mt-1 font-display text-2xl font-semibold">{data.accepted}</dd></div><div className="rounded-lg bg-background p-3"><dt className="font-label text-xs text-on-surface-variant">Refusées</dt><dd className="m-0 mt-1 font-display text-2xl font-semibold">{data.rejected}</dd></div></dl>
}

export function DashboardView() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [api] = useState(() => createDashboardApi())

  async function load(): Promise<void> {
    setLoading(true)
    setError(false)
    const result = await api.getDashboard()
    if (!result) setError(true)
    else setDashboard(result)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  return <AppShell active="Dashboard">{loading && !dashboard ? <main className="min-h-screen px-5 pb-28 pt-24 md:px-8 md:pt-10 lg:px-10"><div className="mx-auto max-w-6xl"><DashboardLoading /></div></main> : error && !dashboard ? <DashboardError onRetry={() => { void load() }} /> : dashboard ? <main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10"><div className="mx-auto max-w-6xl"><header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Tableau de bord</p><h1 className="m-0 mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Bonjour, {dashboard.user.username}</h1><p className="m-0 mt-2 text-on-surface-variant">Retrouvez vos prochaines aventures et les actions importantes.</p></div><Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-on-primary no-underline transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/parties/nouvelle"><Sparkles aria-hidden="true" size={18} />Créer une partie</Link></header><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]"><div className="grid gap-5"><DashboardBlock block={dashboard.nextSession} title="Prochaine séance" emptyMessage="Aucune séance planifiée pour le moment." onRetry={() => { void load() }}>{(session) => <div className="rounded-xl bg-primary p-5 text-on-primary"><div className="flex items-start justify-between gap-4"><div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary-fixed">À venir</p><h3 className="m-0 mt-2 font-display text-2xl font-semibold">{session.gameTitle}</h3></div><CalendarDays aria-hidden="true" className="text-primary-fixed" size={26} /></div><p className="m-0 mt-5 inline-flex items-center gap-2 text-sm text-primary-fixed"><Clock3 aria-hidden="true" size={17} />{dateLabel(session.startsAt)}</p><Link className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-lg bg-on-primary px-4 font-semibold text-primary no-underline hover:bg-primary-fixed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary" href={`/planning#session-${encodeURIComponent(session.id)}`}>Voir le planning <ArrowRight aria-hidden="true" size={16} /></Link></div>}</DashboardBlock><DashboardBlock block={dashboard.activeGames} title="Parties actives" emptyMessage="Vous ne participez encore à aucune partie active." onRetry={() => { void load() }}>{(games) => <ActiveGames games={games} />}</DashboardBlock></div><aside className="grid content-start gap-5"><DashboardBlock block={dashboard.applications} title="Mes candidatures" emptyMessage="Aucune candidature à suivre." onRetry={() => { void load() }}>{(data) => <Summary data={data} />}</DashboardBlock><DashboardBlock block={dashboard.invitations} title="Invitations" emptyMessage="Aucune invitation en attente." onRetry={() => { void load() }}>{(data) => <div className="grid gap-3"><div className="flex items-center justify-between rounded-lg bg-background p-3"><span className="inline-flex items-center gap-2 text-sm text-on-surface-variant"><ListChecks aria-hidden="true" size={17} />Reçues</span><strong className="font-display text-2xl text-primary">{data.receivedPending}</strong></div><div className="flex items-center justify-between rounded-lg bg-background p-3"><span className="inline-flex items-center gap-2 text-sm text-on-surface-variant"><UsersRound aria-hidden="true" size={17} />Envoyées</span><strong className="font-display text-2xl">{data.sentPending}</strong></div></div>}</DashboardBlock><DashboardBlock block={dashboard.schedulingActions} title="À faire" emptyMessage="Aucune action urgente." onRetry={() => { void load() }}>{(actions) => <ul className="m-0 grid gap-3 p-0">{actions.map((action) => <li className="flex items-start gap-3 rounded-lg bg-background p-3" key={`${action.kind}-${action.proposalId ?? action.sessionId}`}><CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} /><div><p className="m-0 text-sm font-semibold">{actionLabel(action)}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">{action.gameTitle}</p></div></li>)}</ul>}</DashboardBlock></aside></div></div></main> : null}</AppShell>
}
