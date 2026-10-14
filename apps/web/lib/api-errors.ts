type ApiErrorInput = {
  status: number
  code?: string
  fallback?: string
}

/** Converts stable API error codes to French instructions without showing response internals. */
export function translateApiError({ status, code, fallback = 'Une erreur est survenue. Réessayez.' }: ApiErrorInput): string {
  if (status === 401 || code === 'AUTH_ERROR') return 'Connectez-vous pour poursuivre, puis réessayez.'
  if (code === 'INVALID_GAME_TAG') return 'Un ou plusieurs tags ne sont pas disponibles. Choisissez des tags actifs.'
  return fallback
}
