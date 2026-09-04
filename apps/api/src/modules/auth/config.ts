import { z } from 'zod'

const authEnvironmentSchema = z.object({
  APP_ORIGIN: z.string().trim().min(1),
  DISCORD_CLIENT_ID: z.string().regex(/^\d{17,20}$/),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  JWT_SIGNING_SECRET: z.string().min(1),
  JWT_PREVIOUS_SIGNING_SECRET: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().min(1).optional(),
  ),
  NODE_ENV: z.string().optional(),
})

export type AuthConfig = {
  appOrigin: string
  clientId: string
  clientSecret: string
  isProduction: boolean
  jwtSigningSecret: string
  previousJwtSigningSecret: string | null
  redirectUri: string
}

function validateJwtSigningSecret(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('JWT signing secret must be base64url encoded')
  }

  const decoded = Buffer.from(value, 'base64url')
  if (decoded.length < 32 || decoded.toString('base64url') !== value) {
    throw new Error('JWT signing secret must encode at least 32 bytes')
  }

  return value
}

/** Parses server-only OAuth configuration and rejects callback substitutions. */
export function parseAuthConfig(environment: unknown): AuthConfig {
  const values = authEnvironmentSchema.parse(environment)
  const jwtSigningSecret = validateJwtSigningSecret(values.JWT_SIGNING_SECRET)
  const previousJwtSigningSecret = values.JWT_PREVIOUS_SIGNING_SECRET
    ? validateJwtSigningSecret(values.JWT_PREVIOUS_SIGNING_SECRET)
    : null

  if (previousJwtSigningSecret === jwtSigningSecret) {
    throw new Error('JWT signing secrets must differ')
  }
  const appOriginUrl = new URL(values.APP_ORIGIN)
  const isProduction = values.NODE_ENV === 'production'

  if (appOriginUrl.pathname !== '/' || appOriginUrl.search || appOriginUrl.hash) {
    throw new Error('APP_ORIGIN must not include a path, query, or fragment')
  }

  if (isProduction && appOriginUrl.protocol !== 'https:') {
    throw new Error('APP_ORIGIN must use HTTPS in production')
  }

  const appOrigin = appOriginUrl.origin
  const redirectUri = new URL(values.DISCORD_REDIRECT_URI).toString()
  const fixedCallbackUrl = `${appOrigin}/api/auth/discord/callback`

  if (redirectUri !== fixedCallbackUrl) {
    throw new Error('DISCORD_REDIRECT_URI must match the fixed callback URL')
  }

  return {
    appOrigin,
    clientId: values.DISCORD_CLIENT_ID,
    clientSecret: values.DISCORD_CLIENT_SECRET,
    isProduction,
    jwtSigningSecret,
    previousJwtSigningSecret,
    redirectUri,
  }
}
