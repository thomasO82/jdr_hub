import { describe, expect, it } from 'vitest'
import { getAvailability } from '../../../src/modules/availability/services/get-availability.js'
import { replaceAvailability } from '../../../src/modules/availability/services/replace-availability.js'
import { searchPlayers } from '../../../src/modules/availability/services/search-players.js'
import { createInMemoryAvailabilityRepository } from '../../helpers/in-memory-availability-repository.js'

const payload = {
  timezone: 'Europe/Paris',
  rules: [{ dayOfWeek: 1, startMinute: 18 * 60, endMinute: 22 * 60 }],
  exceptions: [],
  preferences: { availabilityPublic: true, invitationNotifications: true, experienceLevel: 'INTERMEDIATE' as const },
  preferredSystems: ['D&D 5e'],
}

describe('availability services', () => {
  it('replaces a user snapshot and returns it on the next read', async () => {
    const repository = createInMemoryAvailabilityRepository()
    const saved = await replaceAvailability({ userId: 'user-1', payload, repository, now: new Date('2026-09-05T10:00:00.000Z') })
    const loaded = await getAvailability({ userId: 'user-1', repository })
    expect(saved).toEqual(loaded)
    expect(loaded?.rules).toEqual(payload.rules)
  })

  it('rejects an invalid timezone before repository access', async () => {
    const repository = createInMemoryAvailabilityRepository()
    await expect(replaceAvailability({ userId: 'user-1', payload: { ...payload, timezone: 'Not/A_Timezone' }, repository })).rejects.toThrow('AVAILABILITY_TIMEZONE_INVALID')
    expect(repository.replacements).toHaveLength(0)
  })

  it('searches players by name and system without exposing precise availability', async () => {
    const repository = createInMemoryAvailabilityRepository({ snapshots: [
      { userId: 'player-1', username: 'Arkanis', avatarUrl: null, level: null, ...payload },
      { userId: 'player-2', username: 'Beren', avatarUrl: null, level: null, ...payload, preferredSystems: ['Pathfinder 2'] },
    ] })
    const result = await searchPlayers({ viewerId: 'gm-1', query: { q: 'arkan', system: 'D&D 5e', page: 1, pageSize: 20 }, repository })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ id: 'player-1', username: 'Arkanis', availabilityCompatible: null })
    expect(result.items[0]).not.toHaveProperty('rules')
    expect(result.items[0]).not.toHaveProperty('startMinute')
  })

  it('returns aggregate compatibility only for public availability', async () => {
    const repository = createInMemoryAvailabilityRepository({ snapshots: [
      { userId: 'public', username: 'Public', avatarUrl: null, level: null, ...payload },
      { userId: 'private', username: 'Private', avatarUrl: null, level: null, ...payload, preferences: { ...payload.preferences, availabilityPublic: false } },
    ] })
    const result = await searchPlayers({ viewerId: 'gm-1', query: { dayOfWeek: 1, startMinute: 19 * 60, endMinute: 20 * 60, page: 1, pageSize: 20 }, repository })
    expect(result.items.find((player) => player.id === 'public')?.availabilityCompatible).toBe(true)
    expect(result.items.find((player) => player.id === 'private')?.availabilityCompatible).toBeNull()
  })
})
