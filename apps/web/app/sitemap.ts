import type { MetadataRoute } from 'next'
import { createPublicGamesApi } from '../lib/public-games-api'

const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await createPublicGamesApi().slugs()
  const urls: MetadataRoute.Sitemap = [
    { url: `${siteOrigin}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteOrigin}/parties`, changeFrequency: 'hourly', priority: 0.9 },
  ]
  if (!slugs) return urls
  urls.push(...slugs.games.map((slug) => ({ url: `${siteOrigin}/parties/${slug}`, changeFrequency: 'daily' as const, priority: 0.8 })))
  urls.push(...slugs.gms.map((slug) => ({ url: `${siteOrigin}/mj/${slug}`, changeFrequency: 'daily' as const, priority: 0.6 })))
  urls.push(...slugs.tags.map((slug) => ({ url: `${siteOrigin}/tags/${slug}`, changeFrequency: 'daily' as const, priority: 0.5 })))
  urls.push(...slugs.systems.map((slug) => ({ url: `${siteOrigin}/jeux/${slug}`, changeFrequency: 'daily' as const, priority: 0.5 })))
  return urls
}
