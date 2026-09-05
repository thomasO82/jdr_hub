import Link from 'next/link'
import type { PublicCollection } from '@jdr-hub/shared'
import { AppShell } from '../layout/app-shell'

export function PublicCollectionView({ collection }: { collection: PublicCollection }) {
  return (
    <AppShell>
      <main className="min-h-screen bg-background px-5 py-8 font-body text-on-surface md:px-8 md:py-12">
        <section className="mx-auto max-w-6xl" aria-labelledby="collection-title">
          <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Découvrir</p>
          <h1 className="m-0 mt-2 font-display text-4xl font-semibold tracking-tight" id="collection-title">{collection.name}</h1>
          <p className="m-0 mt-2 text-on-surface-variant">{collection.games.length} partie{collection.games.length === 1 ? '' : 's'} publique{collection.games.length === 1 ? '' : 's'}</p>
          {collection.games.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collection.games.map((game) => (
                <Link className="rounded-2xl border border-surface-container-highest bg-surface p-5 no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10" href={`/parties/${game.slug}`} key={game.slug}>
                  <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">{game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</p>
                  <h2 className="m-0 mt-2 truncate font-display text-xl font-semibold text-on-surface">{game.title}</h2>
                  <p className="m-0 mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{game.description}</p>
                  <p className="m-0 mt-4 text-xs font-semibold text-on-surface-variant">{game.system} · MJ {game.gameMaster.name}</p>
                </Link>
              ))}
            </div>
          ) : <p className="mt-8 rounded-xl border border-dashed border-outline-variant bg-surface p-10 text-center text-sm text-on-surface-variant">Aucune partie publique disponible.</p>}
        </section>
      </main>
    </AppShell>
  )
}
