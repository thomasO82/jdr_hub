import { z } from 'zod'
import { gameFormatSchema, gameTypeSchema } from './games.js'

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
  type: gameTypeSchema.optional(),
  format: gameFormatSchema.optional(),
  system: z.string().trim().min(1).max(100).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  minAvailablePlaces: z.coerce.number().int().min(0).max(12).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict().superRefine((query, context) => {
  if (query.dateFrom && query.dateTo && query.dateTo < query.dateFrom) {
    context.addIssue({ code: 'custom', path: ['dateTo'], message: 'dateTo must not precede dateFrom' })
  }
})

export type PublicGamesQuery = z.infer<typeof publicGamesQuerySchema>
export type PublicGame = {
  id: string
  slug: string
  title: string
  system: string
  description: string
  type: 'ONE_SHOT' | 'CAMPAIGN'
  format: 'ONLINE' | 'TABLE'
  status: 'OPEN' | 'ACTIVE'
  maxPlayers: number
  availablePlaces: number
  nextSessionStartsAt: string | null
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
