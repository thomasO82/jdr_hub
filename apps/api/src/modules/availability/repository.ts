import { and, asc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { authSchema, availabilitySchema, type createDatabase } from '@jdr-hub/database'
import type {
  AvailabilityPayload,
  AvailabilityPreferences,
  AvailabilityRule,
  AvailabilitySnapshot,
  PlayerQuery,
  PlayerSummary,
  PlayersPage,
} from '@jdr-hub/shared'

export type PlayerSearchQuery = PlayerQuery

export interface AvailabilityRepository {
  getForUser(userId: string): Promise<AvailabilitySnapshot | null>
  replaceForUser(userId: string, payload: AvailabilityPayload, now: Date): Promise<AvailabilitySnapshot>
  searchPlayers(query: PlayerSearchQuery): Promise<PlayersPage>
}

type Database = ReturnType<typeof createDatabase>['db']

const toPreferences = (row: {
  availabilityPublic: boolean
  invitationNotifications: boolean
  experienceLevel: string | null
}): AvailabilityPreferences => ({
  availabilityPublic: row.availabilityPublic,
  invitationNotifications: row.invitationNotifications,
  experienceLevel: row.experienceLevel === 'BEGINNER' || row.experienceLevel === 'INTERMEDIATE' || row.experienceLevel === 'VETERAN'
    ? row.experienceLevel
    : null,
})

export function createPostgresAvailabilityRepository(database: Database): AvailabilityRepository {
  const { users } = authSchema
  const { availabilityRules, availabilityExceptions, userPreferences, userPreferredSystems } = availabilitySchema

  const readSnapshot = async (userId: string, db: Pick<Database, 'select'> = database): Promise<AvailabilitySnapshot | null> => {
    const [user] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1)
    if (!user) return null
    const [preference] = await db.select({
      availabilityPublic: userPreferences.availabilityPublic,
      invitationNotifications: userPreferences.invitationNotifications,
      experienceLevel: userPreferences.experienceLevel,
    }).from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1)
    const [rules, exceptions, systems] = await Promise.all([
      db.select({ dayOfWeek: availabilityRules.dayOfWeek, startMinute: availabilityRules.startMinute, endMinute: availabilityRules.endMinute })
        .from(availabilityRules).where(eq(availabilityRules.userId, userId)).orderBy(asc(availabilityRules.dayOfWeek), asc(availabilityRules.startMinute)),
      db.select({ startsAt: availabilityExceptions.startsAt, endsAt: availabilityExceptions.endsAt, label: availabilityExceptions.label })
        .from(availabilityExceptions).where(eq(availabilityExceptions.userId, userId)).orderBy(asc(availabilityExceptions.startsAt)),
      db.select({ system: userPreferredSystems.system }).from(userPreferredSystems).where(eq(userPreferredSystems.userId, userId)).orderBy(asc(userPreferredSystems.system)),
    ])
    return {
      userId,
      timezone: user.timezone,
      rules: rules as AvailabilityRule[],
      exceptions: exceptions.map((exception) => ({ startsAt: exception.startsAt.toISOString(), endsAt: exception.endsAt.toISOString(), label: exception.label })),
      preferences: preference ? toPreferences(preference) : { availabilityPublic: false, invitationNotifications: true, experienceLevel: null },
      preferredSystems: systems.map(({ system }) => system),
    }
  }

  return {
    async getForUser(userId) {
      return readSnapshot(userId)
    },
    async replaceForUser(userId, payload, now) {
      await database.transaction(async (tx) => {
        await tx.update(users).set({ timezone: payload.timezone, updatedAt: now }).where(eq(users.id, userId))
        await tx.delete(availabilityRules).where(eq(availabilityRules.userId, userId))
        await tx.delete(availabilityExceptions).where(eq(availabilityExceptions.userId, userId))
        await tx.delete(userPreferredSystems).where(eq(userPreferredSystems.userId, userId))
        await tx.delete(userPreferences).where(eq(userPreferences.userId, userId))
        if (payload.rules.length > 0) await tx.insert(availabilityRules).values(payload.rules.map((rule) => ({ ...rule, userId, createdAt: now, updatedAt: now })))
        if (payload.exceptions.length > 0) await tx.insert(availabilityExceptions).values(payload.exceptions.map((exception) => ({ userId, startsAt: new Date(exception.startsAt), endsAt: new Date(exception.endsAt), label: exception.label, createdAt: now, updatedAt: now })))
        await tx.insert(userPreferences).values({ userId, ...payload.preferences, updatedAt: now, createdAt: now })
        if (payload.preferredSystems.length > 0) await tx.insert(userPreferredSystems).values(payload.preferredSystems.map((system) => ({ userId, system })))
      })
      const saved = await readSnapshot(userId)
      if (!saved) throw new Error('AVAILABILITY_SAVE_FAILED')
      return saved
    },
    async searchPlayers(query) {
      const conditions = [sql`true`]
      if (query.q) conditions.push(ilike(users.username, `%${query.q}%`))
      if (query.system) conditions.push(sql`exists (select 1 from user_preferred_systems ups where ups.user_id = ${users.id} and ups.system = ${query.system})`)
      const rows = await database.select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        preferredSystem: userPreferredSystems.system,
        availabilityPublic: userPreferences.availabilityPublic,
      }).from(users)
        .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
        .leftJoin(userPreferredSystems, eq(userPreferredSystems.userId, users.id))
        .where(and(...conditions))
        .orderBy(asc(users.username))
        .limit(query.pageSize * 20)
        .offset((query.page - 1) * query.pageSize)
      const grouped = new Map<string, { id: string; username: string; avatarUrl: string | null; preferredSystems: string[]; availabilityPublic: boolean }>()
      for (const row of rows) {
        const current = grouped.get(row.id) ?? { id: row.id, username: row.username, avatarUrl: row.avatarUrl, preferredSystems: [], availabilityPublic: row.availabilityPublic ?? false }
        if (row.preferredSystem) current.preferredSystems.push(row.preferredSystem)
        grouped.set(row.id, current)
      }
      const items: PlayerSummary[] = await Promise.all([...grouped.values()].map(async (player) => {
        let availabilityCompatible: boolean | null = null
        if (player.availabilityPublic && query.dayOfWeek !== undefined && query.startMinute !== undefined && query.endMinute !== undefined) {
          const [match] = await database.select({ id: availabilityRules.id }).from(availabilityRules).where(and(eq(availabilityRules.userId, player.id), eq(availabilityRules.dayOfWeek, query.dayOfWeek), sql`${availabilityRules.startMinute} < ${query.endMinute}`, sql`${availabilityRules.endMinute} > ${query.startMinute}`)).limit(1)
          availabilityCompatible = Boolean(match)
        }
        return { id: player.id, username: player.username, avatarUrl: player.avatarUrl, level: null, preferredSystems: [...new Set(player.preferredSystems)], availabilityCompatible }
      }))
      return { items, page: query.page, pageSize: query.pageSize }
    },
  }
}
