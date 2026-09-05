import type { Metadata } from 'next'
import { GamesListView } from '../../features/games/games-list-view'
import { isIndexableGamesQuery } from '../../lib/public-seo'

type SearchParams = Record<string, string | string[] | undefined>

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const params = await searchParams
  const tagSlugs = params.tagSlugs
  const query = {
    ...(typeof params.q === 'string' ? { q: params.q } : {}),
    ...(typeof params.gmId === 'string' ? { gmId: params.gmId } : {}),
    ...(typeof params.gmName === 'string' ? { gmName: params.gmName } : {}),
    tagSlugs: Array.isArray(tagSlugs) ? tagSlugs : tagSlugs ? [tagSlugs] : [],
    ...(typeof params.page === 'string' ? { page: Number(params.page) } : {}),
  }
  const indexable = isIndexableGamesQuery(query)
  return {
    title: 'Parties | JDR Hub',
    description: 'Trouvez une partie de jeu de rôle et rejoignez une nouvelle aventure.',
    alternates: { canonical: '/parties' },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: 'Parties | JDR Hub', description: 'Trouvez votre prochaine aventure de jeu de rôle.', type: 'website' },
  }
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <GamesListView searchParams={await searchParams} />
}
