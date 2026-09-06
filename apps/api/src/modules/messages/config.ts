export type MessageConfig = {
  redisUrl: string
}

/** Parses the Redis connection once at API startup. Secrets stay in the URL's runtime environment. */
export function parseMessageConfig(environment: unknown): MessageConfig {
  const rawUrl = environment && typeof environment === 'object' && 'REDIS_URL' in environment
    ? (environment as { REDIS_URL?: unknown }).REDIS_URL
    : undefined
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) throw new Error('REDIS_URL is required')
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('REDIS_URL must be a valid URL')
  }
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') throw new Error('REDIS_URL must use redis or rediss')
  if (!url.hostname) throw new Error('REDIS_URL must include a hostname')
  return { redisUrl: rawUrl }
}
