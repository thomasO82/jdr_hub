import { describe, expect, it, vi } from 'vitest'
import { createGameMessagesApi, mergeGameMessages } from '../lib/game-messages-api.js'

const page = {
  items: [{ id: 'message-1', author: { name: 'MJ', avatarUrl: null }, content: 'Bienvenue', createdAt: '2026-09-06T12:00:00.000Z' }],
  nextCursor: null,
  canWrite: true,
}

describe('game messages API client', () => {
  it('merges a live message received during history loading without duplicates or reordering', () => {
    const live = { id: 'message-3', author: { name: 'Joueur', avatarUrl: null }, content: 'En direct', createdAt: '2026-09-06T12:02:00.000Z' }
    const history = [
      { id: 'message-3', author: { name: 'Joueur', avatarUrl: null }, content: 'En direct', createdAt: '2026-09-06T12:02:00.000Z' },
      { id: 'message-2', author: { name: 'MJ', avatarUrl: null }, content: 'Deux', createdAt: '2026-09-06T12:01:00.000Z' },
      { id: 'message-1', author: { name: 'MJ', avatarUrl: null }, content: 'Un', createdAt: '2026-09-06T12:00:00.000Z' },
    ]

    expect(mergeGameMessages([live], history)).toEqual(history)
  })

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
    const listeners = new Map<string, EventListener>()
    const source = {
      onmessage: null as ((event: MessageEvent<string>) => void) | null,
      onerror: null as (() => void) | null,
      addEventListener: (type: string, listener: EventListener) => { listeners.set(type, listener) },
      removeEventListener: (type: string) => { listeners.delete(type) },
      close: vi.fn(),
    }
    const eventSourceFactory = vi.fn().mockReturnValue(source)
    const onMessage = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const api = createGameMessagesApi({ baseUrl: '/api', eventSourceFactory })

    const unsubscribe = api.subscribe('brumes', { lastEventId: '1710000000000-0', onReady, onMessage, onError })
    expect(eventSourceFactory).toHaveBeenCalledWith('/api/games/brumes/messages/stream', { withCredentials: true })
    expect(eventSourceFactory.mock.calls[0]?.[0]).not.toContain('Salut')
    listeners.get('ready')?.(new MessageEvent('ready', { data: '{}' }))
    source.onmessage?.(new MessageEvent('message', { data: JSON.stringify(page.items[0]) }))
    source.onerror?.()
    unsubscribe()
    expect(onReady).toHaveBeenCalledOnce()
    expect(onMessage).toHaveBeenCalledWith(page.items[0])
    expect(onError).toHaveBeenCalledOnce()
    expect(listeners.has('ready')).toBe(false)
    expect(source.close).toHaveBeenCalledOnce()
  })
})
