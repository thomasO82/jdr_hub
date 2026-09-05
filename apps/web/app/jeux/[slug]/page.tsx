import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicCollectionView } from '../../../features/games/public-collection-view'
import { createPublicGamesApi } from '../../../lib/public-games-api'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = (await params).slug
  const collection = await createPublicGamesApi().collection('system', slug)
  return collection ? { title: `Parties ${collection.name} | JDR Hub`, description: `Parties publiques sur ${collection.name}.`, alternates: { canonical: `/jeux/${slug}` } } : { title: 'Jeu introuvable | JDR Hub' }
}

export default async function PublicSystemPage({ params }: PageProps) {
  const collection = await createPublicGamesApi().collection('system', (await params).slug)
  if (!collection) notFound()
  return <PublicCollectionView collection={collection} />
}
