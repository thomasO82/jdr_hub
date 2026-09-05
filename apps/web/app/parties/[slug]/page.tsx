import type { Metadata } from 'next'
import { GameDetailView } from '../../../features/games/game-detail-view'

export const metadata: Metadata = {
  title: 'La Crypte Maudite | JDR Hub',
  description: 'Découvrez les détails de cette partie de jeu de rôle.',
}

export default function GameDetailPage() {
  return <GameDetailView />
}
