import type { MetadataRoute } from 'next'

const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/planning', '/profil', '/gestion', '/candidatures', '/invitations'] },
    sitemap: `${siteOrigin}/sitemap.xml`,
  }
}
