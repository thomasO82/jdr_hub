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

function assertContent(content: string): void {
  const trimmed = content.trim()
  if (trimmed.length === 0 || trimmed.length > 2_000) throw new Error('DISCORD_INVALID_CONTENT')
}

async function readResponse(response: Response, errorCode: string): Promise<unknown> {
  if (response.status === 429) throw new Error('DISCORD_RATE_LIMIT')
  if (!response.ok) throw new Error(errorCode)
  try {
    return await response.json()
  } catch {
    throw new Error(errorCode)
  }
}

export function createDiscordNotifier(config: NotificationConfig, fetcher: FetchFunction = globalThis.fetch): DiscordNotifier {
  const headers = {
    Authorization: `Bot ${config.botToken}`,
    'Content-Type': 'application/json',
  }

  return {
    async sendDirectMessage({ recipientDiscordId, content, idempotencyKey }) {
      if (!discordIdSchema.safeParse(recipientDiscordId).success) throw new Error('DISCORD_INVALID_RECIPIENT')
      if (idempotencyKey.trim().length === 0 || idempotencyKey.length > 25) throw new Error('DISCORD_INVALID_IDEMPOTENCY_KEY')
      assertContent(content)

      let channelResponse: Response
      try {
        channelResponse = await fetcher(`${DISCORD_API_BASE_URL}/users/@me/channels`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ recipient_id: recipientDiscordId }),
        })
      } catch {
        throw new Error('DISCORD_UNAVAILABLE')
      }
      const channel = discordChannelSchema.safeParse(await readResponse(channelResponse, 'DISCORD_UNAVAILABLE'))
      if (!channel.success) throw new Error('DISCORD_UNAVAILABLE')

      let messageResponse: Response
      try {
        messageResponse = await fetcher(`${DISCORD_API_BASE_URL}/channels/${channel.data.id}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: content.trim(), nonce: idempotencyKey, allowed_mentions: { parse: [] } }),
        })
      } catch {
        throw new Error('DISCORD_UNAVAILABLE')
      }
      const message = discordMessageSchema.safeParse(await readResponse(messageResponse, 'DISCORD_UNAVAILABLE'))
      if (!message.success) throw new Error('DISCORD_UNAVAILABLE')
      return { providerMessageId: message.data.id }
    },
  }
}
