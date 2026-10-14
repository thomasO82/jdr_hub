import type { Metadata } from 'next'
import { LandingView } from '../features/home/landing-view'

export const metadata: Metadata = {
  title: 'JDR Hub — Organisez vos parties de jeu de rôle',
  description: 'Créez vos parties, coordonnez les disponibilités et planifiez les séances de jeu de rôle avec JDR Hub.',
}

export default function HomePage(): React.JSX.Element {
  return <LandingView />
}
