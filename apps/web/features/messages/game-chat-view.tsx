'use client'

import { MessageCircle, RefreshCw, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameMessageView } from '@jdr-hub/shared'
import { createGameMessagesApi, GAME_MESSAGES_ERROR } from '../../lib/game-messages-api'

type ChatStatus = 'loading' | 'ready' | 'error'

function formatMessageDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function GameChatView({ gameId }: { gameId: string }) {
  const api = useMemo(() => createGameMessagesApi(), [])
  const [messages, setMessages] = useState<GameMessageView[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [canWrite, setCanWrite] = useState(false)
  const [status, setStatus] = useState<ChatStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [streamError, setStreamError] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const loadMessages = useCallback(async (cursor?: string) => {
    try {
      const page = await api.getMessages(gameId, cursor ? { cursor } : undefined)
      setMessages((current) => cursor ? [...current, ...page.items.filter((item) => !current.some((existing) => existing.id === item.id))] : page.items)
      setNextCursor(page.nextCursor)
      setCanWrite(page.canWrite)
      setError(null)
      setStatus('ready')
    } catch {
      setError(GAME_MESSAGES_ERROR)
      setStatus('error')
    }
  }, [api, gameId])

  useEffect(() => { void loadMessages() }, [loadMessages])

  useEffect(() => {
    if (status !== 'ready') return
    return api.subscribe(gameId, {
      onMessage: (message) => {
        setMessages((current) => current.some((existing) => existing.id === message.id) ? current : [message, ...current])
        setStreamError(false)
      },
      onError: () => setStreamError(true),
    })
  }, [api, gameId, status])

  const send = async () => {
    if (!canWrite || sending || draft.trim().length === 0) return
    setSending(true)
    try {
      const message = await api.sendMessage(gameId, draft)
      setMessages((current) => current.some((existing) => existing.id === message.id) ? current : [message, ...current])
      setDraft('')
      setError(null)
    } catch {
      setError(GAME_MESSAGES_ERROR)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm md:p-7" aria-labelledby="game-chat-title">
      <header className="flex items-start justify-between gap-4 border-b border-outline-variant pb-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-fixed text-primary"><MessageCircle aria-hidden="true" size={22} /></span>
          <div>
            <h2 className="m-0 font-display text-2xl font-semibold" id="game-chat-title">Conversation de la partie</h2>
            <p className="m-0 mt-1 font-body text-sm text-on-surface-variant">Les échanges restent dans l’application.</p>
          </div>
        </div>
        <span className="rounded-full bg-surface-container px-3 py-1 font-label text-xs font-semibold text-on-surface-variant">Texte uniquement</span>
      </header>

      {error ? (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-error bg-error-container px-4 py-3 text-sm text-error" role="alert">
          <span>{error}</span>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-error underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void loadMessages()} type="button"><RefreshCw aria-hidden="true" size={16} />Réessayer</button>
        </div>
      ) : null}

      {streamError && !error ? <p className="mt-4 rounded-lg bg-surface-container px-4 py-3 font-body text-sm text-on-surface-variant" role="status">La mise à jour en direct est momentanément indisponible. Réessayez.</p> : null}

      <div aria-live="polite" className="mt-5 grid max-h-96 min-h-44 content-start gap-3 overflow-y-auto rounded-xl bg-background p-4">
        {status === 'loading' ? <p className="m-0 font-body text-sm text-on-surface-variant" role="status">Chargement de la conversation…</p> : null}
        {status === 'ready' && messages.length === 0 ? <p className="m-0 font-body text-sm text-on-surface-variant">Aucun message pour le moment. Lancez la conversation.</p> : null}
        {status === 'ready' && messages.map((message) => (
          <article className="rounded-xl border border-outline-variant bg-surface px-4 py-3" key={message.id}>
            <header className="flex items-baseline justify-between gap-3">
              <strong className="font-body text-sm font-semibold text-on-surface">{message.author.name}</strong>
              <time className="font-label text-xs text-on-surface-variant" dateTime={message.createdAt}>{formatMessageDate(message.createdAt)}</time>
            </header>
            <p className="m-0 mt-2 whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-on-surface">{message.content}</p>
          </article>
        ))}
      </div>

      {nextCursor && status === 'ready' ? <button className="mt-4 min-h-11 rounded-lg px-3 font-body text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void loadMessages(nextCursor)} type="button">Charger les messages précédents</button> : null}

      {status === 'ready' && canWrite ? (
        <form className="mt-5 flex flex-col gap-3 border-t border-outline-variant pt-5 md:flex-row md:items-end" onSubmit={(event) => { event.preventDefault(); void send() }}>
          <label className="grid flex-1 gap-2 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant" htmlFor="game-chat-message">Écrire un message
            <textarea className="min-h-12 resize-y rounded-lg border border-outline bg-surface px-4 py-3 font-body text-base normal-case tracking-normal text-on-surface outline-none placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary" id="game-chat-message" maxLength={2_000} onChange={(event) => setDraft(event.target.value)} placeholder="Écrire un message à la table" value={draft} />
          </label>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-body font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={sending || draft.trim().length === 0} type="submit"><Send aria-hidden="true" size={18} />{sending ? 'Envoi…' : 'Envoyer'}</button>
        </form>
      ) : null}

      {status === 'ready' && !canWrite ? <p className="mt-5 rounded-xl bg-surface-container px-4 py-3 font-body text-sm text-on-surface-variant" role="status"><strong className="font-semibold text-on-surface">Lecture seule.</strong> La conversation reste consultable, mais les nouveaux messages sont désactivés.</p> : null}
    </section>
  )
}
