import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createGamesApi } from '../../../features/games/games-api'
import { GameDetailView } from '../../../features/games/game-detail-view'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const game = await createGamesApi().detail((await params).slug)
  return game
    ? { title: `${game.title} | JDR Hub`, description: game.description.slice(0, 160) }
    : { title: 'Partie introuvable | JDR Hub' }
}

export default async function GameDetailPage({ params }: PageProps) {
  const game = await createGamesApi().detail((await params).slug)
  if (!game) notFound()
  return <GameDetailView game={game} />
}
