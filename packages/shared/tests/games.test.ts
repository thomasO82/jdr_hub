import { describe, expect, it } from 'vitest'
import { createGameSchema, gameQuerySchema, updateGameSchema } from '../src/games.js'

const valid = {
  title: 'La Crypte Maudite',
  system: 'D&D 5e',
  description: 'Une aventure sombre.',
  type: 'ONE_SHOT' as const,
  maxPlayers: 4,
  visibility: 'PUBLIC' as const,
  tags: ['horror', 'beginner'],
}

describe('game contracts', () => {
  it('accepts a valid game and normalizes tag slugs', () => {
    expect(createGameSchema.parse({ ...valid, tags: ['Horror', 'beginner'] }).tags).toEqual(['horror', 'beginner'])
  })

  it('rejects unknown properties and invalid player limits', () => {
    expect(() => createGameSchema.parse({ ...valid, ownerId: 'forbidden' })).toThrow()
    expect(() => createGameSchema.parse({ ...valid, maxPlayers: 0 })).toThrow()
  })

  it('allows partial updates but never protected fields', () => {
    expect(updateGameSchema.parse({ title: 'Nouveau titre' })).toEqual({ title: 'Nouveau titre' })
    expect(() => updateGameSchema.parse({ ownerId: 'forbidden' })).toThrow()
  })

  it('validates bounded AND tag queries', () => {
    expect(gameQuerySchema.parse({ q: 'crypte', tagSlugs: ['horror', 'beginner'], page: '2' })).toEqual({
      q: 'crypte', tagSlugs: ['horror', 'beginner'], page: 2, pageSize: 20,
    })
    expect(() => gameQuerySchema.parse({ page: '0' })).toThrow()
  })
})
