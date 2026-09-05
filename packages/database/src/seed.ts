import { createDatabase, migrateDatabase } from './index.js'
import { authSchema, gameSchema } from './index.js'
import { seedData } from './seed-data.js'

type Database = ReturnType<typeof createDatabase>['db']

export function assertSeedEnvironment(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error('Development seed cannot run in production')
  }
}

/** Insert deterministic development fixtures without removing existing data. */
export async function seedDatabase(db: Database): Promise<void> {
  const now = new Date()

  await db.transaction(async (tx) => {
    for (const user of seedData.users) {
      await tx
        .insert(authSchema.users)
        .values(user)
        .onConflictDoUpdate({
          target: authSchema.users.discordId,
          set: {
            username: user.username,
            avatarUrl: user.avatarUrl,
            timezone: user.timezone,
            updatedAt: now,
          },
        })
    }

    for (const tag of seedData.tags) {
      await tx
        .insert(gameSchema.tags)
        .values(tag)
        .onConflictDoUpdate({
          target: gameSchema.tags.slug,
          set: { name: tag.name, isActive: tag.isActive },
        })
    }

    for (const game of seedData.games) {
      await tx
        .insert(gameSchema.games)
        .values(game)
        .onConflictDoUpdate({
          target: gameSchema.games.slug,
          set: {
            ownerId: game.ownerId,
            title: game.title,
            system: game.system,
            description: game.description,
            type: game.type,
            status: game.status,
            visibility: game.visibility,
            maxPlayers: game.maxPlayers,
            updatedAt: now,
          },
        })
    }

    const tags = await tx
      .select({ id: gameSchema.tags.id, slug: gameSchema.tags.slug })
      .from(gameSchema.tags)
    const tagIds = new Map(tags.map((tag) => [tag.slug, tag.id]))

    for (const link of seedData.gameTags) {
      const tagId = tagIds.get(link.tagSlug)
      if (!tagId) throw new Error(`Seed tag not found: ${link.tagSlug}`)

      await tx
        .insert(gameSchema.gameTags)
        .values({ gameId: link.gameId, tagId })
        .onConflictDoNothing()
    }

    for (const application of seedData.applications) {
      await tx
        .insert(gameSchema.applications)
        .values(application)
        .onConflictDoUpdate({
          target: [gameSchema.applications.gameId, gameSchema.applications.userId],
          set: {
            message: application.message,
            status: application.status,
            updatedAt: now,
          },
        })
    }

    for (const member of seedData.members) {
      await tx
        .insert(gameSchema.gameMembers)
        .values(member)
        .onConflictDoUpdate({
          target: [gameSchema.gameMembers.gameId, gameSchema.gameMembers.userId],
          set: { role: member.role, status: member.status },
        })
    }
  })
}

async function main(): Promise<void> {
  assertSeedEnvironment(process.env.NODE_ENV)
  const database = createDatabase(process.env.DATABASE_URL)

  try {
    await migrateDatabase(database)
    await seedDatabase(database.db)
    console.log(`Development seed applied: ${seedData.games.length} games, ${seedData.tags.length} tags.`)
  } finally {
    await database.client.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
