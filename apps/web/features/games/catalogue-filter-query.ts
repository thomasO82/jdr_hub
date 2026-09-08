import type { PublicGamesQuery } from '@jdr-hub/shared'

export type CatalogueSearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return first && first.length > 0 ? first : undefined
}

export function buildCatalogueQuery(searchParams: CatalogueSearchParams): Partial<PublicGamesQuery> {
  const query: Partial<PublicGamesQuery> = {}
  for (const key of ['q', 'gmId', 'gmName', 'system', 'dateFrom', 'dateTo'] as const) {
    const value = firstValue(searchParams[key])
    if (value) query[key] = value
  }

  const type = firstValue(searchParams.type)
  if (type === 'ONE_SHOT' || type === 'CAMPAIGN') query.type = type
  const format = firstValue(searchParams.format)
  if (format === 'ONLINE' || format === 'TABLE') query.format = format

  const tags = searchParams.tagSlugs
  query.tagSlugs = (Array.isArray(tags) ? tags : tags ? [tags] : []).filter(Boolean)

  const minAvailablePlaces = firstValue(searchParams.minAvailablePlaces)
  if (minAvailablePlaces) {
    const parsed = Number(minAvailablePlaces)
    if (Number.isInteger(parsed)) query.minAvailablePlaces = parsed
  }

  const page = firstValue(searchParams.page)
  if (page && Number.isInteger(Number(page))) query.page = Number(page)
  const pageSize = firstValue(searchParams.pageSize)
  if (pageSize && Number.isInteger(Number(pageSize))) query.pageSize = Number(pageSize)

  return query
}
