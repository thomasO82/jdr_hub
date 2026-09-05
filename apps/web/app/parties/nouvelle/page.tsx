import type { Metadata } from 'next'
import { NewGameView } from '../../../features/games/new-game-view'

export const metadata: Metadata = {
  title: 'Créer une partie | JDR Hub',
  description: 'Créez une partie de jeu de rôle sur JDR Hub.',
  robots: { index: false, follow: false },
}

export default function NewGamePage() {
  return <NewGameView />
}
