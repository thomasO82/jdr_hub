const ABSENCE_ERROR = 'L’absence n’a pas pu être signalée. Vérifiez le statut de la séance puis réessayez.'

type ApiEnvelope<T> = { data: T | null }
type AttendanceApiOptions = { baseUrl?: string; origin?: string; fetcher?: typeof fetch }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function browserOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

function throwAbsenceError(): never {
  throw new Error(ABSENCE_ERROR)
}

export function createAttendanceApi(options: AttendanceApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const origin = options.origin ?? browserOrigin()
  const fetcher = options.fetcher ?? fetch

  return {
    async reportAbsence(sessionId: string): Promise<void> {
      try {
        const response = await fetcher(apiUrl(baseUrl, `/sessions/${encodeURIComponent(sessionId)}/absence`), {
          method: 'POST',
          credentials: 'include',
          headers: { accept: 'application/json', 'content-type': 'application/json', ...(origin ? { origin } : {}) },
          body: '{}',
          cache: 'no-store',
        })
        if (!response.ok) return throwAbsenceError()
        const body = await response.json() as ApiEnvelope<unknown>
        if (!body.data) return throwAbsenceError()
      } catch (error) {
        if (error instanceof Error && error.message === ABSENCE_ERROR) throw error
        return throwAbsenceError()
      }
    },
  }
}

export { ABSENCE_ERROR }
