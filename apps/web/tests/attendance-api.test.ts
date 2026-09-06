import { describe, expect, it, vi } from 'vitest'
import { createAttendanceApi } from '../lib/attendance-api.js'

describe('attendance API client', () => {
  it('reports an absence with credentials, trusted origin and an empty payload', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { attendance: { status: 'EXCUSED' } } }), { status: 201 }))
    const api = createAttendanceApi({ baseUrl: 'http://localhost:8787/api', origin: 'http://localhost:8787', fetcher })

    await expect(api.reportAbsence('session-1')).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/sessions/session-1/absence', expect.objectContaining({ method: 'POST', credentials: 'include', headers: expect.objectContaining({ origin: 'http://localhost:8787' }), body: '{}' }))
  })

  it('translates a failed report into a French actionable error', async () => {
    const api = createAttendanceApi({ fetcher: vi.fn().mockResolvedValue(new Response('{}', { status: 409 })) })
    await expect(api.reportAbsence('session-1')).rejects.toThrow('L’absence n’a pas pu être signalée. Vérifiez le statut de la séance puis réessayez.')
  })
})
