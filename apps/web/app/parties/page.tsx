import type { Metadata } from 'next'
import { GamesListView } from '../../features/games/games-list-view'

export const metadata: Metadata = {
  title: 'Parties | JDR Hub',
  description: 'Trouvez une partie de jeu de rôle et rejoignez une nouvelle aventure.',
}

export default function GamesPage() {
  return <GamesListView />
}
