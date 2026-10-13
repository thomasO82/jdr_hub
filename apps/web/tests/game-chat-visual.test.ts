import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourcePath = resolve(import.meta.dirname, '../features/messages/game-chat-view.tsx')

describe('game chat visual component', () => {
  it('provides text messaging controls and accessible live updates', () => {
    const source = readFileSync(sourcePath, 'utf8')
    expect(source).toContain("'use client'")
    expect(source).toContain('aria-live="polite"')
    expect(source).toContain('Écrire un message')
    expect(source).toContain('Envoyer')
    expect(source).toContain('Aucun message')
    expect(source).toContain('Lecture seule')
    expect(source).toContain('Réessayer')
  })

  it('keeps chat text-only, French, and on the application design tokens', () => {
    const source = readFileSync(sourcePath, 'utf8')
    expect(source).toContain('bg-surface')
    expect(source).toContain('border-outline-variant')
    expect(source).toContain('focus-visible:')
    expect(source).not.toContain('dangerouslySetInnerHTML')
    expect(source).not.toContain('DISCORD_BOT_TOKEN')
    expect(source).not.toContain('attachment')
  })
})
