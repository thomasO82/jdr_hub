import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicGamesApi } from '../../../lib/public-games-api'
import { GameDetailView } from '../../../features/games/game-detail-view'

// Kept as a local compatibility name for the existing page contract tests.
const createGamesApi = createPublicGamesApi

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const game = await createPublicGamesApi().detail((await params).slug)
  return game
    ? { title: `${game.title} | JDR Hub`, description: game.description.slice(0, 160) }
    : { title: 'Partie introuvable | JDR Hub' }
}

export default async function GameDetailPage({ params }: PageProps) {
  const game = await createPublicGamesApi().detail((await params).slug)
  if (!game) notFound()
  return <GameDetailView game={game} />
}
