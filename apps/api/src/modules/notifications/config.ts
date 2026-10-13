import { z } from 'zod'

const notificationEnvironmentSchema = z.object({
  DISCORD_BOT_TOKEN: z.preprocess((value) => value === '' ? undefined : value, z.string().trim().min(1).optional()),
  DISCORD_NOTIFICATION_INTERVAL_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
  DISCORD_NOTIFICATION_BATCH_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  NODE_ENV: z.string().optional(),
})

export type NotificationConfig = {
  botToken: string
  batchSize: number
  intervalMs: number
  isProduction: boolean
}

/** Discord delivery stays disabled until a bot token is configured. */
export function parseNotificationConfig(environment: unknown): NotificationConfig | null {
  const values = notificationEnvironmentSchema.parse(environment)
  if (!values.DISCORD_BOT_TOKEN) return null
  return {
    botToken: values.DISCORD_BOT_TOKEN,
    batchSize: values.DISCORD_NOTIFICATION_BATCH_LIMIT,
    intervalMs: values.DISCORD_NOTIFICATION_INTERVAL_MS,
    isProduction: values.NODE_ENV === 'production',
  }
}
