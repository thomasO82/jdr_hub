import { z } from 'zod'
import type { NotificationConfig } from './config.js'

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10'
const discordIdSchema = z.string().regex(/^\d{17,20}$/)
const discordChannelSchema = z.object({ id: z.string().min(1) })
const discordMessageSchema = z.object({ id: z.string().min(1) })
type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type DiscordNotifier = {
  sendDirectMessage(input: { recipientDiscordId: string; content: string; idempotencyKey: string }): Promise<{ providerMessageId: string }>
}

const safeErrorCode = (response: Response): string => response.status === 429 ? 'DISCORD_RATE_LIMIT' : 'DISCORD_UNAVAILABLE'

async function readResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(safeErrorCode(response))
  try { return await response.json() } catch { throw new Error('DISCORD_UNAVAILABLE') }
}

/** Sends only bounded server-generated text and explicitly suppresses Discord mentions. */
export function createDiscordNotifier(config: NotificationConfig, fetcher: FetchFunction = globalThis.fetch): DiscordNotifier {
  const headers = { Authorization: `Bot ${config.botToken}`, 'Content-Type': 'application/json' }
  return {
    async sendDirectMessage({ recipientDiscordId, content, idempotencyKey }) {
      if (!discordIdSchema.safeParse(recipientDiscordId).success) throw new Error('DISCORD_INVALID_RECIPIENT')
      if (!content.trim() || content.trim().length > 2_000) throw new Error('DISCORD_INVALID_CONTENT')
      if (!/^[A-Za-z0-9_-]{1,25}$/.test(idempotencyKey)) throw new Error('DISCORD_INVALID_IDEMPOTENCY_KEY')
      let channelResponse: Response
      try {
        channelResponse = await fetcher(`${DISCORD_API_BASE_URL}/users/@me/channels`, { method: 'POST', headers, body: JSON.stringify({ recipient_id: recipientDiscordId }) })
      } catch { throw new Error('DISCORD_UNAVAILABLE') }
      const channel = discordChannelSchema.safeParse(await readResponse(channelResponse))
      if (!channel.success) throw new Error('DISCORD_UNAVAILABLE')
      let messageResponse: Response
      try {
        messageResponse = await fetcher(`${DISCORD_API_BASE_URL}/channels/${channel.data.id}/messages`, {
          method: 'POST', headers,
          body: JSON.stringify({ content: content.trim(), nonce: idempotencyKey, allowed_mentions: { parse: [] } }),
        })
      } catch { throw new Error('DISCORD_UNAVAILABLE') }
      const message = discordMessageSchema.safeParse(await readResponse(messageResponse))
      if (!message.success) throw new Error('DISCORD_UNAVAILABLE')
      return { providerMessageId: message.data.id }
    },
  }
}
