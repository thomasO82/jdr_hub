import { Hono } from 'hono'
import { registerAuthRoutes } from './modules/auth/routes.js'
import type { AuthConfig } from './modules/auth/config.js'
import type { AuthRepository } from './modules/auth/repository.js'
import { registerGamesRoutes } from './modules/games/routes.js'
import type { GamesDependencies } from './modules/games/routes.js'

type ApiVariables = {
  requestId: string
}

type ApiApp = Hono<{ Variables: ApiVariables }>

export const MAX_REQUEST_BODY_BYTES = 1_048_576

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const

export function createApiApp(options?: { auth: { config: AuthConfig; repository: AuthRepository }; games?: GamesDependencies }): ApiApp {
  const app = new Hono<{ Variables: ApiVariables }>()

  app.use('*', async (c, next) => {
    c.set('requestId', crypto.randomUUID())

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      c.header(name, value)
    }

    const rawContentLength = c.req.header('content-length')
    if (rawContentLength !== undefined && !/^\d+$/.test(rawContentLength)) {
      return c.json(
        {
          data: null,
          error: {
            code: 'INVALID_CONTENT_LENGTH',
            message: 'Invalid content length',
          },
          meta: { requestId: c.get('requestId') },
        },
        400,
      )
    }

    const contentLength = Number(rawContentLength ?? 0)
    if (contentLength > MAX_REQUEST_BODY_BYTES) {
      return c.json(
        {
          data: null,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request body too large',
          },
          meta: { requestId: c.get('requestId') },
        },
        413,
      )
    }

    await next()
  })

  app.get('/health', (c) =>
    c.json({
      data: { status: 'ok' },
      error: null,
      meta: { requestId: c.get('requestId') },
    }),
  )

  if (options?.auth) {
    registerAuthRoutes(app, options.auth)
  }
  if (options?.games) {
    registerGamesRoutes(app, options.games)
  }

  app.notFound((c) =>
    c.json(
      {
        data: null,
        error: { code: 'NOT_FOUND', message: 'Not found' },
        meta: { requestId: c.get('requestId') },
      },
      404,
    ),
  )

  app.onError((_error, c) =>
    c.json(
      {
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        meta: { requestId: c.get('requestId') },
      },
      500,
    ),
  )

  return app
}
