import { serve } from '@hono/node-server'
import { createApiApp } from './app.js'
import { parsePort } from './config.js'

const port = parsePort(process.env.PORT)

serve({ fetch: createApiApp().fetch, port })
