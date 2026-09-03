import { z } from 'zod'

export const currentUserSchema = z.object({
  id: z.uuid(),
  username: z.string().trim().min(1).max(64),
  avatarUrl: z.url().max(2_048).nullable(),
  timezone: z.string().trim().min(1).max(64),
})

export type CurrentUser = z.infer<typeof currentUserSchema>

/** Returns the deliberately small profile shape safe to send to a browser. */
export function parseCurrentUser(value: unknown): CurrentUser {
  return currentUserSchema.parse(value)
}
