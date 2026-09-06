const unsafeDiscordContent = /@(?:everyone|here)/gi
const controlCharacters = /[\u0000-\u001F\u007F]/g

/** Builds a bounded, server-generated absence message without exposing internal identifiers. */
export function createAbsenceDiscordContent(input: { gameTitle: string; sessionStartsAt: Date }): string {
  const title = input.gameTitle.replace(unsafeDiscordContent, '').replace(controlCharacters, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || 'votre partie'
  const startsAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(input.sessionStartsAt)
  return `Absence signalée pour « ${title} ». Séance prévue le ${startsAt} (heure de Paris).`
}
