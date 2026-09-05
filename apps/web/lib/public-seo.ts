import type { PublicGamesQuery } from '@jdr-hub/shared'

export function slugifyPublicLabel(label: string): string {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160) || 'public'
}

export function isIndexableGamesQuery(query: Partial<PublicGamesQuery>): boolean {
  return !query.q && !query.gmId && !query.gmName && (!query.tagSlugs || query.tagSlugs.length === 0) && (!query.page || query.page === 1)
}

export function canonicalForPublicPath(pathname: string): string {
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}
