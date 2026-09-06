import { describe, expect, it, vi } from 'vitest'
import { createGameMessagesApi } from '../lib/game-messages-api.js'

const page = {
  items: [{ id: 'message-1', author: { name: 'MJ', avatarUrl: null }, content: 'Bienvenue', createdAt: '2026-09-06T12:00:00.000Z' }],
  nextCursor: null,
  canWrite: true,
}

describe('game messages API client', () => {
  it('loads history with an encoded slug and browser credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: page }), { status: 200 }))
    const api = createGameMessagesApi({ baseUrl: 'http://localhost:8787/api', fetcher })

    await expect(api.getMessages('partie des brumes', { limit: 20 })).resolves.toEqual(page)
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/games/partie%20des%20brumes/messages?limit=20', expect.objectContaining({ credentials: 'include' }))
  })

  it('trims writes and sends the trusted origin without exposing a client author', async () => {
    const message = page.items[0]
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: message }), { status: 201 }))
    const api = createGameMessagesApi({ baseUrl: '/api', origin: 'http://localhost:18080', fetcher })

    await expect(api.sendMessage('brumes', '  Salut la table  ')).resolves.toEqual(message)
    expect(fetcher).toHaveBeenCalledWith('/api/games/brumes/messages', expect.objectContaining({ credentials: 'include', method: 'POST', body: JSON.stringify({ content: 'Salut la table' }), headers: expect.objectContaining({ origin: 'http://localhost:18080' }) }))
  })

  it('translates non-OK responses into a French actionable error', async () => {
    const api = createGameMessagesApi({ fetcher: vi.fn().mockResolvedValue(new Response('internal details', { status: 500 })) })
    await expect(api.getMessages('brumes')).rejects.toThrow('La conversation est momentanément indisponible. Réessayez.')
  })

  it('opens a credentialed stream without putting message content in the URL', () => {
    const source = { onmessage: null as ((event: MessageEvent<string>) => void) | null, onerror: null as (() => void) | null, close: vi.fn() }
    const eventSourceFactory = vi.fn().mockReturnValue(source)
    const onMessage = vi.fn()
    const onError = vi.fn()
    const api = createGameMessagesApi({ baseUrl: '/api', eventSourceFactory })

    const unsubscribe = api.subscribe('brumes', { lastEventId: '1710000000000-0', onMessage, onError })
    expect(eventSourceFactory).toHaveBeenCalledWith('/api/games/brumes/messages/stream', { withCredentials: true })
    expect(eventSourceFactory.mock.calls[0]?.[0]).not.toContain('Salut')
    source.onmessage?.(new MessageEvent('message', { data: JSON.stringify(page.items[0]) }))
    source.onerror?.()
    unsubscribe()
    expect(onMessage).toHaveBeenCalledWith(page.items[0])
    expect(onError).toHaveBeenCalledOnce()
    expect(source.close).toHaveBeenCalledOnce()
  })
})
