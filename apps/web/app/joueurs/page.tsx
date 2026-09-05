import { PlayerSearchView } from '../../features/players/player-search-view'

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  return <PlayerSearchView initialQuery={{ q: typeof params.q === 'string' ? params.q : undefined, system: typeof params.system === 'string' ? params.system : undefined, page: typeof params.page === 'string' ? Number(params.page) : 1, pageSize: 20 }} />
}
