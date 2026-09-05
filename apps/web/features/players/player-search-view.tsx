'use client'

import { useEffect, useState } from 'react'
import type { PlayerQuery, PlayerSummary, PlayersPage } from '@jdr-hub/shared'
import { createPlayersApi } from '../../lib/players-api'
import { AppShell } from '../layout/app-shell'
import { PlayerCard } from './player-card'

const defaultQuery: PlayerQuery = { page: 1, pageSize: 20 }

export function PlayerSearchView({ initialQuery = defaultQuery }: { initialQuery?: Partial<PlayerQuery> }) {
  const [query, setQuery] = useState<Partial<PlayerQuery>>({ ...defaultQuery, ...initialQuery })
  const [page, setPage] = useState<PlayersPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)

  useEffect(() => {
    setLoading(true); setError(false)
    void createPlayersApi().search(query).then((result) => { if (!result) setError(true); setPage(result); setLoading(false) })
  }, [query])

  function update(key: keyof PlayerQuery, value: string) {
    setQuery((current) => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  return (
    <AppShell active="Players">
      <main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10">
        <section className="mx-auto max-w-6xl" aria-labelledby="players-title">
          <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">La communauté JDR Hub</p>
          <h1 className="m-0 mt-2 font-display text-4xl font-semibold tracking-tight" id="players-title">Trouver des Joueurs</h1>
          <p className="m-0 mt-2 max-w-2xl text-on-surface-variant">Trouvez des aventuriers qui partagent vos systèmes et vos créneaux de jeu.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className={filtersOpen ? 'h-fit rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm' : 'hidden lg:block lg:h-fit lg:rounded-xl lg:border lg:border-outline-variant/30 lg:bg-surface lg:p-5 lg:shadow-sm'} aria-label="Filtres de recherche">
              <div className="flex items-center justify-between gap-3"><h2 className="m-0 font-display text-xl font-semibold">Filtrer les joueurs</h2><button className="text-sm font-semibold text-primary lg:hidden" type="button" onClick={() => setFiltersOpen(false)}>Masquer</button></div>
              <label className="mt-5 block text-sm font-semibold" htmlFor="player-search">Nom ou pseudo<input className="mt-2 min-h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal focus-visible:outline-2 focus-visible:outline-primary" id="player-search" value={query.q ?? ''} onChange={(event) => update('q', event.target.value)} placeholder="Rechercher…" /></label>
              <label className="mt-5 block text-sm font-semibold" htmlFor="player-system">Système<select className="mt-2 min-h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal focus-visible:outline-2 focus-visible:outline-primary" id="player-system" value={query.system ?? ''} onChange={(event) => update('system', event.target.value)}><option value="">Tous les systèmes</option><option>D&D 5e</option><option>Pathfinder 2</option><option>Cthulhu</option></select></label>
              <label className="mt-5 block text-sm font-semibold" htmlFor="player-day">Jour préféré<select className="mt-2 min-h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal focus-visible:outline-2 focus-visible:outline-primary" id="player-day" value={query.dayOfWeek ?? ''} onChange={(event) => update('dayOfWeek', event.target.value)}><option value="">Tous les jours</option><option value="1">Lundi</option><option value="2">Mardi</option><option value="3">Mercredi</option><option value="4">Jeudi</option><option value="5">Vendredi</option><option value="6">Samedi</option><option value="0">Dimanche</option></select></label>
            </aside>
            <section aria-live="polite">
              {!filtersOpen && <button className="mb-4 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-primary lg:hidden" type="button" onClick={() => setFiltersOpen(true)}>Afficher les filtres</button>}
              {loading && <p className="rounded-xl border border-dashed border-outline-variant bg-surface p-10 text-center text-sm text-on-surface-variant" role="status">Recherche des joueurs…</p>}
              {!loading && error && <p className="rounded-xl border border-error/30 bg-error-container p-10 text-center text-sm text-on-error-container" role="alert">La recherche est indisponible. Réessayez dans un instant.</p>}
              {!loading && !error && page && page.items.length === 0 && <p className="rounded-xl border border-dashed border-outline-variant bg-surface p-10 text-center text-sm text-on-surface-variant">Aucun joueur ne correspond à vos filtres.</p>}
              {!loading && !error && page && page.items.length > 0 && <><div className="grid gap-4 md:grid-cols-2">{page.items.map((player: PlayerSummary) => <PlayerCard key={player.id} player={player} />)}</div><div className="mt-6 flex items-center justify-between"><button className="rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40" type="button" disabled={query.page === 1} onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, Number(current.page ?? 1) - 1) }))}>Précédent</button><span className="text-sm text-on-surface-variant">Page {page.page}</span><button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-40" type="button" disabled={page.items.length < page.pageSize} onClick={() => setQuery((current) => ({ ...current, page: Number(current.page ?? 1) + 1 }))}>Suivant</button></div></>}
            </section>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
