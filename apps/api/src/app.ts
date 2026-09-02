import { Hono } from 'hono'

type ApiVariables = {
  requestId: string
}

type ApiApp = Hono<{ Variables: ApiVariables }>

export function createApiApp(): ApiApp {
  const app = new Hono<{ Variables: ApiVariables }>()

  app.use('*', async (c, next) => {
    c.set('requestId', crypto.randomUUID())
    await next()
  })

  app.get('/health', (c) =>
    c.json({
      data: { status: 'ok' },
      error: null,
      meta: { requestId: c.get('requestId') },
    }),
  )

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
