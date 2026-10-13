import { z } from 'zod'

export const XP_REWARDS = {
  SESSION_ATTENDED: 100,
} as const

export const XP_LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 250 },
  { level: 3, xp: 600 },
  { level: 4, xp: 1_100 },
  { level: 5, xp: 1_750 },
] as const

const XP_LEVEL_INCREMENT = XP_LEVEL_THRESHOLDS[XP_LEVEL_THRESHOLDS.length - 1]!.xp - XP_LEVEL_THRESHOLDS[XP_LEVEL_THRESHOLDS.length - 2]!.xp

export const xpReasonSchema = z.enum(['SESSION_ATTENDED'])

export const xpEventSchema = z.object({
  id: z.string().trim().min(1).max(128),
  sessionId: z.string().trim().min(1).max(128).nullable(),
  amount: z.number().int().min(1),
  reason: xpReasonSchema,
  createdAt: z.iso.datetime({ offset: true }),
}).strict()

export const xpSummarySchema = z.object({
  totalXp: z.number().int().min(0),
  level: z.number().int().min(1),
  currentLevelXp: z.number().int().min(0),
  nextLevelXp: z.number().int().min(1).nullable(),
  progressPercent: z.number().int().min(0).max(100),
}).strict()

export const xpHistoryQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

export const xpHistoryPageSchema = z.object({
  summary: xpSummarySchema,
  items: z.array(xpEventSchema).max(50),
  nextCursor: z.string().min(1).max(256).nullable(),
}).strict()

export type XpReason = z.infer<typeof xpReasonSchema>
export type XpEvent = z.infer<typeof xpEventSchema>
export type XpSummary = z.infer<typeof xpSummarySchema>
export type XpHistoryQuery = z.infer<typeof xpHistoryQuerySchema>
export type XpHistoryPage = z.infer<typeof xpHistoryPageSchema>

function assertTotalXp(totalXp: number): void {
  if (!Number.isInteger(totalXp) || totalXp < 0) throw new RangeError('XP total must be a non-negative integer')
}

function thresholdForLevel(level: number): number {
  if (level <= XP_LEVEL_THRESHOLDS.length) return XP_LEVEL_THRESHOLDS[level - 1]!.xp
  return XP_LEVEL_THRESHOLDS.at(-1)!.xp + (level - XP_LEVEL_THRESHOLDS.length) * XP_LEVEL_INCREMENT
}

export function calculateLevel(totalXp: number): number {
  assertTotalXp(totalXp)
  let level = 1
  while (totalXp >= thresholdForLevel(level + 1)) level += 1
  return level
}

export function calculateProgress(totalXp: number): Pick<XpSummary, 'currentLevelXp' | 'nextLevelXp' | 'progressPercent'> {
  const level = calculateLevel(totalXp)
  const currentLevelXp = thresholdForLevel(level)
  const nextLevelXp = thresholdForLevel(level + 1)
  const progressPercent = Math.min(100, Math.floor(((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))
  return { currentLevelXp, nextLevelXp, progressPercent }
}

export function createXpSummary(totalXp: number): XpSummary {
  const level = calculateLevel(totalXp)
  return { totalXp, level, ...calculateProgress(totalXp) }
}
