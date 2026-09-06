import { z } from 'zod'

const notificationEnvironmentSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().trim().min(1),
  NODE_ENV: z.string().optional(),
})

export type NotificationConfig = {
  botToken: string
  isProduction: boolean
}

export function parseNotificationConfig(environment: unknown): NotificationConfig {
  const values = notificationEnvironmentSchema.parse(environment)
  return {
    botToken: values.DISCORD_BOT_TOKEN,
    isProduction: values.NODE_ENV === 'production',
  }
}
