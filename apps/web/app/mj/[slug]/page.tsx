import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicCollectionView } from '../../../features/games/public-collection-view'
import { createPublicGamesApi } from '../../../lib/public-games-api'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = (await params).slug
  const collection = await createPublicGamesApi().collection('gm', slug)
  return collection ? { title: `${collection.name} | JDR Hub`, description: `Les parties publiques de ${collection.name}.`, alternates: { canonical: `/mj/${slug}` } } : { title: 'MJ introuvable | JDR Hub' }
}

export default async function PublicGameMasterPage({ params }: PageProps) {
  const collection = await createPublicGamesApi().collection('gm', (await params).slug)
  if (!collection) notFound()
  return <PublicCollectionView collection={collection} />
}
