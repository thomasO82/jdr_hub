import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemorySchedulingRepository } from '../../helpers/in-memory-scheduling-repository.js'
import { registerSchedulingRoutes, type SchedulingRouteEnv } from '../../../src/modules/scheduling/routes.js'

const config = parseAuthConfig({ APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678', DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback', JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })
const now = new Date()
const gameId = '00000000-0000-4000-8000-000000000010'
const slot = { startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' }

async function createTestApp() {
  const authRepository = createInMemoryAuthRepository()
  const owner = await authRepository.upsertDiscordUser({ discordId: 'discord-owner', username: 'MJ', avatarUrl: null }, now)
  const member = await authRepository.upsertDiscordUser({ discordId: 'discord-member', username: 'Joueur', avatarUrl: null }, now)
  const credentials = await Promise.all([owner, member].map(async (user, index) => {
    const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(index + 1) })
    await authRepository.createSession(user.id, credential)
    const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
    return { user, cookie: `jdr_hub_access=${token}` }
  }))
  const repository = createInMemorySchedulingRepository({ games: [{ id: gameId, ownerId: owner.id, title: 'La crypte', type: 'ONE_SHOT', status: 'ACTIVE' }], members: [{ gameId, userId: owner.id }, { gameId, userId: member.id }] })
  const app = new Hono<SchedulingRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerSchedulingRoutes(app, { authConfig: config, authRepository, repository, now: () => now })
  return { app, owner: credentials[0]!, member: credentials[1]!, repository }
}

describe('scheduling API routes', () => {
  it('requires authentication and validates mutation origins', async () => {
    const { app, owner } = await createTestApp()
    expect((await app.request('/planning')).status).toBe(401)
    expect((await app.request('/games/nope/proposals', { method: 'POST', headers: { cookie: owner.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ slots: [slot] }) })).status).toBe(403)
  })

  it('creates proposals, lists them for members and accepts one vote', async () => {
    const { app, owner, member } = await createTestApp()
    const headers = { cookie: owner.cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const created = await app.request(`/games/${gameId}/proposals`, { method: 'POST', headers, body: JSON.stringify({ slots: [slot] }) })
    expect(created.status).toBe(201)
    const proposalId = (await created.json()).data[0].id as string
    expect((await app.request(`/games/${gameId}/proposals`, { headers: { cookie: member.cookie } })).status).toBe(200)
    const voted = await app.request(`/proposals/${proposalId}/votes`, { method: 'POST', headers: { ...headers, cookie: member.cookie }, body: JSON.stringify({ vote: 'YES' }) })
    expect(voted.status).toBe(200)
    expect((await voted.json()).data[0].votes.yes).toBe(1)
  })

  it('selects one option per round, closes siblings and preserves votes in later rounds', async () => {
    const { app, owner, member } = await createTestApp()
    const ownerHeaders = { cookie: owner.cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const firstRound = await app.request(`/games/${gameId}/proposals`, {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({ slots: [slot, { startsAt: '2026-10-21T18:00:00.000Z', endsAt: '2026-10-21T21:00:00.000Z' }] }),
    })
    expect(firstRound.status).toBe(201)
    const firstOptions = (await firstRound.json()).data as Array<{ id: string; roundId: string }>
    expect(firstOptions[0]?.roundId).toBe(firstOptions[1]?.roundId)

    const memberHeaders = { ...ownerHeaders, cookie: member.cookie }
    expect((await app.request(`/proposals/${firstOptions[0]!.id}/votes`, { method: 'POST', headers: memberHeaders, body: JSON.stringify({ vote: 'YES' }) })).status).toBe(200)
    expect((await app.request(`/games/${gameId}/proposals`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ slots: [slot] }) })).status).toBe(409)

    const selected = await app.request(`/games/${gameId}/sessions`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ proposalId: firstOptions[1]!.id }) })
    expect(selected.status).toBe(201)
    const history = (await app.request(`/games/${gameId}/proposals`, { headers: { cookie: member.cookie } })).json()
    const historyData = (await history).data as Array<{ id: string; status: string; roundStatus: string; votes: { yes: number }; userVote: string | null }>
    expect(historyData.find((proposal) => proposal.id === firstOptions[0]!.id)).toMatchObject({ status: 'CLOSED', roundStatus: 'SELECTED', votes: { yes: 1 }, userVote: 'YES' })
    expect((await app.request(`/proposals/${firstOptions[0]!.id}/votes`, { method: 'POST', headers: memberHeaders, body: JSON.stringify({ vote: 'NO' }) })).status).toBe(409)

    const nextRound = await app.request(`/games/${gameId}/proposals`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ slots: [slot] }) })
    expect(nextRound.status).toBe(201)
    const nextOption = ((await nextRound.json()).data as Array<{ roundId: string; roundStatus: string }>).find((proposal) => proposal.roundStatus === 'OPEN')
    expect(nextOption?.roundId).not.toBe(firstOptions[0]?.roundId)
    expect(nextOption?.roundStatus).toBe('OPEN')
  })

  it('returns generic errors for invalid payloads and duplicate votes', async () => {
    const { app, owner, member } = await createTestApp()
    const headers = { cookie: owner.cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    expect((await app.request(`/games/${gameId}/proposals`, { method: 'POST', headers, body: JSON.stringify({ slots: [] }) })).status).toBe(400)
    const created = await app.request(`/games/${gameId}/proposals`, { method: 'POST', headers, body: JSON.stringify({ slots: [slot] }) })
    const proposalId = (await created.json()).data[0].id as string
    const voteHeaders = { ...headers, cookie: member.cookie }
    expect((await app.request(`/proposals/${proposalId}/votes`, { method: 'POST', headers: voteHeaders, body: JSON.stringify({ vote: 'YES' }) })).status).toBe(200)
    const duplicate = await app.request(`/proposals/${proposalId}/votes`, { method: 'POST', headers: voteHeaders, body: JSON.stringify({ vote: 'NO' }) })
    expect(duplicate.status).toBe(409)
    expect((await duplicate.json()).error).toEqual({ code: 'SCHEDULING_ERROR', message: 'Scheduling request failed' })
  })

  it('creates a fixed session and exposes it in the member planning', async () => {
    const { app, owner, member } = await createTestApp()
    const headers = { cookie: owner.cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const created = await app.request(`/games/${gameId}/sessions`, { method: 'POST', headers, body: JSON.stringify({ ...slot, notes: null }) })
    expect(created.status).toBe(201)
    const planning = await app.request(`/planning?from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.000Z`, { headers: { cookie: member.cookie } })
    expect(planning.status).toBe(200)
    expect((await planning.json()).data.items).toHaveLength(1)
  })

  it('lets the owner list, edit and cancel a session through strict protected commands', async () => {
    const { app, owner, member } = await createTestApp()
    const ownerHeaders = { cookie: owner.cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const memberHeaders = { ...ownerHeaders, cookie: member.cookie }
    const created = await app.request(`/games/${gameId}/sessions`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ ...slot, notes: null }) })
    const session = (await created.json()).data as { id: string; startsAt: string }

    expect((await app.request(`/games/${gameId}/sessions`, { headers: { cookie: owner.cookie } })).status).toBe(200)
    expect((await app.request(`/games/${gameId}/sessions`, { headers: { cookie: member.cookie } })).status).toBe(403)
    expect((await app.request(`/games/${gameId}/sessions`, { headers: {} })).status).toBe(401)
    expect((await app.request(`/games/${gameId}/sessions/${session.id}`, { method: 'PATCH', headers: { ...ownerHeaders, origin: 'https://attacker.example' }, body: JSON.stringify(slot) })).status).toBe(403)
    expect((await app.request(`/games/${gameId}/sessions/${session.id}`, { method: 'PATCH', headers: memberHeaders, body: JSON.stringify(slot) })).status).toBe(403)
    expect((await app.request(`/games/${gameId}/sessions/${session.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ ...slot, status: 'CANCELLED' }) })).status).toBe(400)
    expect((await app.request(`/games/${gameId}/sessions/not-a-session`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ ...slot, endsAt: slot.startsAt }) })).status).toBe(400)

    const changedWindow = { startsAt: '2026-10-22T18:00:00.000Z', endsAt: '2026-10-22T21:00:00.000Z' }
    const updated = await app.request(`/games/${gameId}/sessions/${session.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify(changedWindow) })
    expect(updated.status).toBe(200)
    expect((await updated.json()).data).toMatchObject(changedWindow)
    const visiblePlanning = await app.request('/planning?from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.000Z', { headers: { cookie: member.cookie } })
    expect((await visiblePlanning.json()).data.items[0]).toMatchObject(changedWindow)

    const cancelled = await app.request(`/games/${gameId}/sessions/${session.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ status: 'CANCELLED' }) })
    expect(cancelled.status).toBe(200)
    expect((await cancelled.json()).data.status).toBe('CANCELLED')
    const ownerHistory = await (await app.request(`/games/${gameId}/sessions`, { headers: { cookie: owner.cookie } })).json()
    expect(ownerHistory).toMatchObject({ data: [expect.objectContaining({ status: 'CANCELLED' })] })
    const inactivePlanning = await (await app.request(`/planning?from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.000Z`, { headers: { cookie: member.cookie } })).json()
    expect(inactivePlanning).toMatchObject({ data: { items: [] } })
    expect((await app.request(`/games/${gameId}/sessions/${session.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ status: 'CANCELLED' }) })).status).toBe(409)
  })
})
