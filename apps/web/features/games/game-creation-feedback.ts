import { translateApiError } from '../../lib/api-errors'

type CreatedGame = { id: string; slug: string; visibility: 'PUBLIC' | 'PRIVATE' }

/** Gives a creation failure a safe French message based on the stable API status and code. */
export function gameCreationErrorMessage(status: number, errorCode?: string): string {
  return translateApiError({ status, ...(errorCode ? { code: errorCode } : {}), fallback: 'La partie n’a pas pu être créée. Vérifiez les informations puis réessayez.' })
}

/** Sends owners to the right destination for a newly created public or private game. */
export function createdGameDestination(game: CreatedGame): string {
  return game.visibility === 'PUBLIC'
    ? `/parties/${encodeURIComponent(game.slug)}`
    : `/gestion/parties/${encodeURIComponent(game.id)}`
}
