import { describe, expect, it } from 'vitest'
import { translateApiError } from '../lib/api-errors'

describe('API error translation', () => {
  it('translates authentication and unavailable game tag errors into French actions', () => {
    expect(translateApiError({ status: 401, code: 'AUTH_ERROR' })).toContain('Connectez-vous')
    expect(translateApiError({ status: 400, code: 'INVALID_GAME_TAG' })).toContain('tags actifs')
  })

  it('uses the supplied French fallback for unrelated failures', () => {
    expect(translateApiError({ status: 409, code: 'GAME_ERROR', fallback: 'Réessayez.' })).toBe('Réessayez.')
  })
})
