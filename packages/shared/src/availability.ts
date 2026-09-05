import { z } from 'zod'

const minuteSchema = z.number().int().min(0).max(1440)
const daySchema = z.number().int().min(0).max(6)

export const availabilityRuleSchema = z.object({
  dayOfWeek: daySchema,
  startMinute: minuteSchema.max(1439),
  endMinute: minuteSchema,
}).refine((rule) => rule.endMinute > rule.startMinute, {
  message: 'Availability range must end after it starts',
}).strict()

export const availabilityExceptionSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  label: z.string().trim().min(1).max(120),
}).refine((exception) => new Date(exception.endsAt).getTime() > new Date(exception.startsAt).getTime(), {
  message: 'Availability exception must end after it starts',
}).strict()

export const availabilityPreferencesSchema = z.object({
  availabilityPublic: z.boolean().default(false),
  invitationNotifications: z.boolean().default(true),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'VETERAN']).nullable().default(null),
}).strict()

export const availabilityPayloadSchema = z.object({
  timezone: z.string().trim().min(1).max(64),
  rules: z.array(availabilityRuleSchema).max(50),
  exceptions: z.array(availabilityExceptionSchema).max(50),
  preferences: availabilityPreferencesSchema,
  preferredSystems: z.array(z.string().trim().min(1).max(100)).max(20),
}).strict()

export const playerQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  system: z.string().trim().min(1).max(100).optional(),
  dayOfWeek: daySchema.optional(),
  startMinute: minuteSchema.max(1439).optional(),
  endMinute: minuteSchema.optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict().superRefine((query, context) => {
  if ((query.startMinute === undefined) !== (query.endMinute === undefined)) {
    context.addIssue({ code: 'custom', message: 'Availability window requires startMinute and endMinute' })
  }
  if (query.startMinute !== undefined && query.endMinute !== undefined && query.endMinute <= query.startMinute) {
    context.addIssue({ code: 'custom', message: 'Availability window must end after it starts' })
  }
})

export const playerSummarySchema = z.object({
  id: z.uuid(),
  username: z.string().trim().min(1).max(64),
  avatarUrl: z.url().max(2_048).nullable(),
  level: z.number().int().min(1).nullable(),
  preferredSystems: z.array(z.string().trim().min(1).max(100)).max(20),
  availabilityCompatible: z.boolean().nullable(),
}).strict()

export type AvailabilityRule = z.infer<typeof availabilityRuleSchema>
export type AvailabilityException = z.infer<typeof availabilityExceptionSchema>
export type AvailabilityPreferences = z.infer<typeof availabilityPreferencesSchema>
export type AvailabilityPayload = z.infer<typeof availabilityPayloadSchema>
export type PlayerQuery = z.infer<typeof playerQuerySchema>
export type PlayerSummary = z.infer<typeof playerSummarySchema>

export type AvailabilitySnapshot = AvailabilityPayload & { userId: string }
export type PlayersPage = { items: PlayerSummary[]; page: number; pageSize: number }
