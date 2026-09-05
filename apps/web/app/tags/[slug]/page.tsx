import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicCollectionView } from '../../../features/games/public-collection-view'
import { createPublicGamesApi } from '../../../lib/public-games-api'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = (await params).slug
  const collection = await createPublicGamesApi().collection('tag', slug)
  return collection ? { title: `Parties ${collection.name} | JDR Hub`, description: `Parties publiques avec le tag ${collection.name}.`, alternates: { canonical: `/tags/${slug}` } } : { title: 'Tag introuvable | JDR Hub' }
}

export default async function PublicTagPage({ params }: PageProps) {
  const collection = await createPublicGamesApi().collection('tag', (await params).slug)
  if (!collection) notFound()
  return <PublicCollectionView collection={collection} />
}
