type SessionWindowDraft = { startsAt: string; endsAt: string }

/** Gives immediate feedback for reversed dates; the API still validates the full window. */
export function sessionWindowValidationMessage(window: SessionWindowDraft): string | null {
  const startsAt = Date.parse(window.startsAt)
  const endsAt = Date.parse(window.endsAt)

  return !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt
    ? 'L’heure de fin doit être postérieure à l’heure de début.'
    : null
}
