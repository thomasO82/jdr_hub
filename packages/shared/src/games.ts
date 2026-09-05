import { z } from 'zod'

export const gameTypeSchema = z.enum(['ONE_SHOT', 'CAMPAIGN'])
export const gameStatusSchema = z.enum(['DRAFT', 'OPEN', 'ACTIVE', 'CLOSED', 'COMPLETED'])
export const gameVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE'])

const tagSlugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64)

export const createGameSchema = z.object({
  title: z.string().trim().min(1).max(160),
  system: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(10_000),
  type: gameTypeSchema,
  maxPlayers: z.number().int().min(1).max(12),
  visibility: gameVisibilitySchema,
  tags: z.array(tagSlugSchema).max(20).refine((values) => new Set(values).size === values.length, 'Tags must be unique').default([]),
}).strict()

export const updateGameSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  system: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(10_000).optional(),
  type: gameTypeSchema.optional(),
  maxPlayers: z.number().int().min(1).max(12).optional(),
  visibility: gameVisibilitySchema.optional(),
  tags: z.array(tagSlugSchema).max(20).refine((values) => new Set(values).size === values.length, 'Tags must be unique').optional(),
}).strict()

export const gameQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  gmId: z.uuid().optional(),
  gmName: z.string().trim().max(64).optional(),
  tagSlugs: z.preprocess((value) => typeof value === 'string' ? [value] : value, z.array(tagSlugSchema).max(20).default([])),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

export type GameType = z.infer<typeof gameTypeSchema>
export type GameStatus = z.infer<typeof gameStatusSchema>
export type GameVisibility = z.infer<typeof gameVisibilitySchema>
export type CreateGameInput = z.infer<typeof createGameSchema>
export type UpdateGameInput = z.infer<typeof updateGameSchema>
export type GameQuery = z.infer<typeof gameQuerySchema>
