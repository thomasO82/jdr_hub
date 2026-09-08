'use client'

import { ArrowLeft, History, LoaderCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { XpEvent, XpHistoryPage } from '@jdr-hub/shared'
import { createXpApi } from '../../lib/xp-api'
import { AppShell } from '../layout/app-shell'
import { XpProgressCard } from './xp-progress-card'

function reasonLabel(reason: XpEvent['reason']): string {
  return reason === 'SESSION_ATTENDED' ? 'Séance jouée' : reason
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function EventRow({ event }: { event: XpEvent }) {
  return <li className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/60 bg-surface p-4">
    <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-fixed text-primary"><Sparkles aria-hidden="true" size={18} /></span><div className="min-w-0"><p className="m-0 truncate font-semibold">{reasonLabel(event.reason)}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">{dateLabel(event.createdAt)}</p></div></div>
    <strong className="shrink-0 font-display text-lg text-primary">+{event.amount} XP</strong>
  </li>
}

export function XpHistoryView() {
  const [page, setPage] = useState<XpHistoryPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [api] = useState(() => createXpApi())

  async function load(): Promise<void> {
    setLoading(true)
    setError(false)
    const result = await api.getHistory({ limit: 20 })
    if (result) setPage(result)
    else setError(true)
    setLoading(false)
  }

  async function loadMore(): Promise<void> {
    if (!page?.nextCursor || loadingMore) return
    setLoadingMore(true)
    const result = await api.getHistory({ cursor: page.nextCursor, limit: 20 })
    if (result) setPage({ summary: result.summary, items: [...page.items, ...result.items], nextCursor: result.nextCursor })
    setLoadingMore(false)
  }

  useEffect(() => { void load() }, [])

  return <AppShell active="Profile"><main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10"><div className="mx-auto grid max-w-4xl gap-6">
    <header className="grid gap-3"><Link className="inline-flex min-h-10 items-center gap-2 justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/profil"><ArrowLeft aria-hidden="true" size={16} />Retour au profil</Link><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Profil</p><h1 className="m-0 font-display text-3xl font-semibold tracking-tight md:text-4xl">Progression et XP</h1><p className="m-0 text-on-surface-variant">Suivez votre progression au fil des séances jouées.</p></header>
    {loading && !page ? <div className="grid gap-4" role="status" aria-label="Chargement de la progression"><div className="h-48 animate-pulse rounded-2xl bg-surface-container" /><div className="h-24 animate-pulse rounded-xl bg-surface-container" /><span className="sr-only">Chargement de l’historique XP…</span></div> : error && !page ? <section className="grid gap-3 rounded-xl border border-error/30 bg-error-container/40 p-6" role="alert"><h2 className="m-0 font-display text-xl font-semibold">Progression indisponible</h2><p className="m-0 text-on-surface-variant">Réessayez dans quelques instants.</p><button className="min-h-12 justify-self-start rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => { void load() }} type="button">Réessayer</button></section> : page ? <div className="grid gap-6"><XpProgressCard summary={page.summary} /><section className="grid gap-4" aria-labelledby="xp-history-title"><div className="flex items-end justify-between gap-4"><div><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Journal</p><h2 className="m-0 mt-1 font-display text-2xl font-semibold" id="xp-history-title">Historique XP</h2></div><History aria-hidden="true" className="text-primary" size={24} /></div>{page.items.length > 0 ? <ul className="m-0 grid gap-3 p-0">{page.items.map((event) => <EventRow event={event} key={event.id} />)}</ul> : <p className="m-0 rounded-xl border border-dashed border-outline-variant bg-surface p-6 text-on-surface-variant">Aucune séance jouée pour le moment.</p>}{page.nextCursor ? <button className="inline-flex min-h-12 items-center justify-center gap-2 justify-self-center rounded-lg border border-outline-variant px-5 font-semibold text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60" disabled={loadingMore} onClick={() => { void loadMore() }} type="button">{loadingMore ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : null}{loadingMore ? 'Chargement…' : 'Charger plus'}</button> : null}</section></div> : null}
  </div></main></AppShell>
}
