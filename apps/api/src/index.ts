import { serve } from '@hono/node-server'
import { createApiApp } from './app.js'

const port = Number.parseInt(process.env.PORT ?? '8787', 10)

serve({ fetch: createApiApp().fetch, port })
