'use client'

import { useEffect, useState } from 'react'
import type { PlayerQuery, PlayerSummary, PlayersPage } from '@jdr-hub/shared'
import { createPlayersApi } from '../../lib/players-api'
import { AppShell } from '../layout/app-shell'
import { EmptyState, ErrorState, LoadingState } from '../ui/async-state'
import { PlayerCard } from './player-card'

const defaultQuery: PlayerQuery = { page: 1, pageSize: 20 }

export function PlayerSearchView({ initialQuery = defaultQuery }: { initialQuery?: Partial<PlayerQuery> }) {
  const [api] = useState(() => createPlayersApi())
  const [query, setQuery] = useState<Partial<PlayerQuery>>({ ...defaultQuery, ...initialQuery })
  const [page, setPage] = useState<PlayersPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(false)
    void api.search(query).then((result) => { if (!result) setError(true); setPage(result); setLoading(false) })
  }, [query])

  function update(key: keyof PlayerQuery, value: string) {
    setQuery((current) => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  const unauthorized = api.lastStatus() === 401

  return <AppShell active="Joueurs">
    <main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10">
      <section className="mx-auto max-w-6xl" aria-labelledby="players-title">
        <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">La communauté JDR Hub</p>
        <h1 className="m-0 mt-2 font-display text-4xl font-semibold tracking-tight" id="players-title">Trouver des Joueurs</h1>
        <p className="m-0 mt-2 max-w-2xl text-on-surface-variant">Trouvez des aventuriers qui partagent vos systèmes et vos créneaux de jeu.</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside aria-label="Filtres de recherche" className={filtersOpen ? 'h-fit rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm' : 'hidden lg:block lg:h-fit lg:rounded-xl lg:border lg:border-outline-variant/30 lg:bg-surface lg:p-5 lg:shadow-sm'} id="player-filters">
            <div className="flex items-center justify-between gap-3"><h2 className="m-0 font-display text-xl font-semibold">Filtrer les joueurs</h2><button aria-controls="player-filters" aria-expanded={filtersOpen} className="min-h-12 rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none lg:hidden" onClick={() => setFiltersOpen(false)} type="button">Masquer</button></div>
            <label className="mt-5 block text-sm font-semibold" htmlFor="player-search">Nom ou pseudo<input className="mt-2 min-h-12 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal focus-visible:outline-2 focus-visible:outline-primary" id="player-search" value={query.q ?? ''} onChange={(event) => update('q', event.target.value)} placeholder="Rechercher…" /></label>
            <label className="mt-5 block text-sm font-semibold" htmlFor="player-system">Système<select className="mt-2 min-h-12 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal focus-visible:outline-2 focus-visible:outline-primary" id="player-system" value={query.system ?? ''} onChange={(event) => update('system', event.target.value)}><option value="">Tous les systèmes</option><option>D&amp;D 5e</option><option>Pathfinder 2</option><option>Cthulhu</option></select></label>
            <label className="mt-5 block text-sm font-semibold" htmlFor="player-day">Jour préféré<select className="mt-2 min-h-12 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal focus-visible:outline-2 focus-visible:outline-primary" id="player-day" value={query.dayOfWeek ?? ''} onChange={(event) => update('dayOfWeek', event.target.value)}><option value="">Tous les jours</option><option value="1">Lundi</option><option value="2">Mardi</option><option value="3">Mercredi</option><option value="4">Jeudi</option><option value="5">Vendredi</option><option value="6">Samedi</option><option value="0">Dimanche</option></select></label>
          </aside>
          <section aria-live="polite">
            {!filtersOpen ? <button aria-controls="player-filters" aria-expanded={filtersOpen} className="mb-4 min-h-12 rounded-lg border border-outline-variant bg-surface px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none lg:hidden" onClick={() => setFiltersOpen(true)} type="button">Afficher les filtres</button> : null}
            {loading ? <LoadingState label="Recherche des joueurs" /> : null}
            {!loading && error ? <section className="rounded-xl border border-error/30 bg-error-container p-6"> <ErrorState message={unauthorized ? 'Votre session a expiré. Reconnectez-vous pour rechercher des joueurs.' : 'La recherche est indisponible. Réessayez dans un instant.'} title="Recherche indisponible" /></section> : null}
            {!loading && !error && page && page.items.length === 0 ? <section className="rounded-xl border border-dashed border-outline-variant bg-surface p-10"><EmptyState message="Aucun joueur ne correspond à vos filtres." title="Aucun résultat" /></section> : null}
            {!loading && !error && page && page.items.length > 0 ? <>
              <div className="grid gap-4 md:grid-cols-2">{page.items.map((player: PlayerSummary) => <PlayerCard key={player.id} player={player} />)}</div>
              <div className="mt-6 flex items-center justify-between gap-3"><button className="min-h-12 rounded-lg border border-outline-variant bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none disabled:opacity-40" type="button" disabled={query.page === 1} onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, Number(current.page ?? 1) - 1) }))}>Précédent</button><span className="text-sm text-on-surface-variant">Page {page.page}</span><button className="min-h-12 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none disabled:opacity-40" type="button" disabled={page.items.length < page.pageSize} onClick={() => setQuery((current) => ({ ...current, page: Number(current.page ?? 1) + 1 }))}>Suivant</button></div>
            </> : null}
          </section>
        </div>
      </section>
    </main>
  </AppShell>
}
