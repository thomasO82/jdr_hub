import type { MetadataRoute } from 'next'

const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [{ url: `${siteOrigin}/`, changeFrequency: 'daily', priority: 1 }]
}
