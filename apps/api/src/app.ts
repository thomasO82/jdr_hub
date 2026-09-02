import { Hono } from 'hono'

export function createApiApp(): Hono {
  const app = new Hono()

  app.get('/health', (c) =>
    c.json({
      data: { status: 'ok' },
      error: null,
      meta: { requestId: crypto.randomUUID() },
    }),
  )

  return app
}
