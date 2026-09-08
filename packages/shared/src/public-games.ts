import { z } from 'zod'

const publicTagSlugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64)

export const publicGameStatusSchema = z.enum(['OPEN', 'ACTIVE'])

export const publicGamesQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  gmId: z.uuid().optional(),
  gmName: z.string().trim().max(64).optional(),
  tagSlugs: z.preprocess(
    (value) => typeof value === 'string' ? [value] : value,
    z.array(publicTagSlugSchema).max(20).default([]),
  ),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

export type PublicGamesQuery = z.infer<typeof publicGamesQuerySchema>
export type PublicGame = {
  id: string
  slug: string
  title: string
  system: string
  description: string
  type: 'ONE_SHOT' | 'CAMPAIGN'
  status: 'OPEN' | 'ACTIVE'
  maxPlayers: number
  tags: Array<{ name: string; slug: string }>
  gameMaster: { name: string; slug: string }
}

export type PublicGamesPage = {
  items: PublicGame[]
  page: number
  pageSize: number
}

export type PublicCollection = {
  slug: string
  name: string
  games: PublicGame[]
}

export type PublicSlugs = {
  games: string[]
  gms: string[]
  tags: string[]
  systems: string[]
}
