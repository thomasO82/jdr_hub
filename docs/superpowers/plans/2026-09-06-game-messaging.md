# Game Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Discord Bot DMs from the runtime while adding a secure text conversation per game with PostgreSQL history, REST writes/reads, SSE delivery, and Redis Streams fan-out.

**Architecture:** Discord remains only the OAuth2 identity provider. Hono services authorize a game owner or active member, persist messages in PostgreSQL, then publish a message identifier to Redis Streams; SSE connections consume the stream and re-read the message projection from PostgreSQL. The frontend uses REST for initial/paginated history and writes, and a credentialed same-origin `EventSource` for live updates.

**Tech Stack:** pnpm monorepo, TypeScript strict, Hono, Next.js App Router, Tailwind CSS v4, Zod, Drizzle ORM, PostgreSQL, Redis Streams, Server-Sent Events.

**Spec:** `docs/superpowers/specs/2026-09-06-game-messaging-design.md`

## Global Constraints

- Work only on `feat/game-messaging`, created from clean `origin/develop`; never create a worktree.
- Keep Discord OAuth2 (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, redirect URI) and remove only Bot DM delivery and the required `DISCORD_BOT_TOKEN`.
- Keep in-app absence notifications and notification read routes; no absence creates a new Discord delivery.
- PostgreSQL remains the source of truth; Redis is an internal, bounded event relay and never the durable message store.
- Use strict Zod schemas, server-derived user identity, resource authorization, bounded payloads, rate limiting, safe French UI errors, and no raw message HTML.
- Do not modify existing migrations; add `0008_game_messages.sql` and regenerate its journal/snapshot through Drizzle.
- Do not delete the historical `notification_deliveries` table; stop writing to it and keep the old migration immutable.
- Tailwind-only frontend: no CSS files, style tags, inline styles, CSS modules, or CSS-in-JS.
- No new dependency may be added without the owner's explicit approval; Redis support uses the official `redis` Node client and its lockfile entry is reviewed before commit.
- New tests are written and observed failing before production code; existing validated tests may change only because this explicit behavior change replaces Discord delivery with in-app behavior.
- Never read or commit `.env`, real Discord credentials, real database URLs, user data, logs, or generated secrets.

## File Map

### Shared contracts

- Create `packages/shared/src/game-messages.ts` for command/query schemas and public message/page types.
- Modify `packages/shared/src/index.ts` to export the new contracts.
- Create `packages/shared/tests/game-messages.test.ts` for strict validation, trimming, bounds, and cursor query behavior.

### Database

- Create `packages/database/src/schema/game-messages.ts` for `game_messages` and its game/author relations.
- Modify `packages/database/src/index.ts` to export and register the schema.
- Create `packages/database/migrations/0008_game_messages.sql` and the generated `packages/database/migrations/meta/0008_snapshot.json`; append the journal entry.
- Create `packages/database/tests/game-messages-schema.test.ts` for columns, constraints, index, and additive migration assertions.

### API and Redis

- Create `apps/api/src/modules/messages/config.ts` for one-time `REDIS_URL` parsing.
- Create `apps/api/src/modules/messages/policy.ts` for read/write access decisions.
- Create `apps/api/src/modules/messages/repository.ts` for access checks, stable pagination, and transactional persistence.
- Create `apps/api/src/modules/messages/event-bus.ts` for the Redis-independent event-bus contract.
- Create `apps/api/src/modules/messages/redis-event-bus.ts` for Redis Streams publishing and per-SSE subscription.
- Create `apps/api/src/modules/messages/services/list-messages.ts` and `create-message.ts` for use cases.
- Create `apps/api/src/modules/messages/handlers.ts` and `routes.ts` for REST/SSE transport only.
- Modify `apps/api/src/app.ts` and `apps/api/src/index.ts` to inject and register the module.
- Modify `apps/api/package.json` and `pnpm-lock.yaml` for the reviewed `redis` dependency.
- Add `apps/api/tests/helpers/in-memory-messages-repository.ts` and `in-memory-message-event-bus.ts`.
- Add unit tests under `apps/api/tests/unit/messages/`, API tests under `apps/api/tests/api/messages/`, and PostgreSQL/Redis integration tests under `apps/api/tests/integration/`.

### Discord delivery removal and infrastructure

- Modify `apps/api/src/modules/attendance/repository.ts`, `services/report-absence.ts`, and attendance test helpers to return only attendance plus in-app notification.
- Modify `apps/api/src/modules/notifications/repository.ts` to retain only list/read persistence.
- Remove runtime imports and startup calls for `apps/api/src/modules/notifications/config.ts`, `discord-client.ts`, `discord-content.ts`, and `worker.ts`; remove their now-obsolete unit tests after replacing the absence regression coverage.
- Modify `packages/shared/src/attendance.ts` and its tests to remove Discord delivery from active contracts while preserving historical database migration compatibility.
- Modify `.env.example`, `docker-compose.yml`, and `docker/Caddyfile`; add internal Redis health/configuration and remove the required Bot token.

### Frontend and documentation

- Create `apps/web/lib/game-messages-api.ts` for REST and SSE browser clients.
- Create `apps/web/features/messages/game-chat-view.tsx` for responsive conversation UI.
- Modify `apps/web/features/games/game-detail-view.tsx` to compose the chat using the existing public game slug.
- Add `apps/web/tests/game-messages-api.test.ts` and `apps/web/tests/game-chat-visual.test.ts`.
- Create `docs/features/015-game-messaging.md`, update F07 with a dated behavior change, update `docs/project-status.md`, `docs/security/authorization-matrix.md`, and `docs/implementation-plan.md`.

---

### Task 1: Define message contracts and database schema

**Files:**
- Create: `packages/shared/src/game-messages.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/game-messages.test.ts`
- Create: `packages/database/src/schema/game-messages.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0008_game_messages.sql`
- Create: `packages/database/migrations/meta/0008_snapshot.json`
- Modify: `packages/database/migrations/meta/_journal.json`
- Test: `packages/database/tests/game-messages-schema.test.ts`

**Interfaces:**
- Produces `gameMessageCommandSchema`, `gameMessageQuerySchema`, `GameMessageView`, `GameMessagesPage`, and the database `gameMessages` table.
- `gameMessageCommandSchema` accepts exactly `{ content: string }`, trims content, rejects empty strings, and caps content at 2,000 characters.
- `gameMessageQuerySchema` accepts an optional opaque cursor and `limit` defaulting to 20 and bounded to 50.
- `gameMessages` stores `id`, `gameId`, `authorId`, `content`, and `createdAt`; the index is `(gameId, createdAt, id)`.

- [ ] **Step 1: Write the failing shared contract tests.**

```ts
it('trims valid text and rejects empty, oversized, and unknown payloads', () => {
  expect(gameMessageCommandSchema.parse({ content: '  Salut la table  ' })).toEqual({ content: 'Salut la table' })
  expect(gameMessageCommandSchema.safeParse({ content: ' '.repeat(2_001) }).success).toBe(false)
  expect(gameMessageCommandSchema.safeParse({ content: '   ' }).success).toBe(false)
  expect(gameMessageCommandSchema.safeParse({ content: 'ok', authorId: 'forged' }).success).toBe(false)
})

it('bounds message pagination and rejects a forged query field', () => {
  expect(gameMessageQuerySchema.parse({})).toEqual({ limit: 20 })
  expect(gameMessageQuerySchema.parse({ cursor: 'opaque-cursor', limit: 50 })).toEqual({ cursor: 'opaque-cursor', limit: 50 })
  expect(gameMessageQuerySchema.safeParse({ limit: 51 }).success).toBe(false)
  expect(gameMessageQuerySchema.safeParse({ userId: 'forged' }).success).toBe(false)
})
```

- [ ] **Step 2: Run the focused shared test to verify the expected Red failure.**

Run: `pnpm exec vitest run packages/shared/tests/game-messages.test.ts`

Expected: FAIL because `../src/game-messages.js` and its exported schemas do not exist yet.

- [ ] **Step 3: Implement the minimal shared contracts and export them.**

Use strict schemas and define the public projection without Discord identifiers:

```ts
export const gameMessageCommandSchema = z.object({
  content: z.string().trim().min(1).max(2_000),
}).strict()

export const gameMessageQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

export type GameMessageView = {
  id: string
  author: { name: string; avatarUrl: string | null }
  content: string
  createdAt: string
}

export type GameMessagesPage = {
  items: GameMessageView[]
  nextCursor: string | null
  canWrite: boolean
}
```

- [ ] **Step 4: Write the failing database schema assertions.**

Assert table name, non-null foreign keys, `varchar(2000)`, timestamp, composite index, and that the new migration contains `CREATE TABLE "game_messages"` without `DROP` statements.

- [ ] **Step 5: Run the database schema test to verify Red.**

Run: `pnpm exec vitest run packages/database/tests/game-messages-schema.test.ts`

Expected: FAIL because the schema export and `0008_game_messages.sql` are absent.

- [ ] **Step 6: Implement the schema and generate the additive migration.**

Define the two foreign keys with targeted cascade behavior and the pagination index. Run `pnpm --filter @jdr-hub/database db:generate`, inspect the generated SQL/snapshot/journal, and keep only the additive `game_messages` objects.

- [ ] **Step 7: Run focused tests and package checks.**

Run: `pnpm exec vitest run packages/shared/tests/game-messages.test.ts packages/database/tests/game-messages-schema.test.ts`

Expected: PASS with all new contract/schema assertions green.

- [ ] **Step 8: Commit the independently testable deliverable.**

```bash
git add packages/shared/src/game-messages.ts packages/shared/src/index.ts packages/shared/tests/game-messages.test.ts packages/database/src/schema/game-messages.ts packages/database/src/index.ts packages/database/migrations/0008_game_messages.sql packages/database/migrations/meta/0008_snapshot.json packages/database/migrations/meta/_journal.json packages/database/tests/game-messages-schema.test.ts
git commit -m "feat: persist game messages"
```

### Task 2: Remove Discord DM delivery while keeping in-app absence notifications

**Files:**
- Modify: `packages/shared/src/attendance.ts`
- Test: `packages/shared/tests/attendance.test.ts`
- Modify: `apps/api/src/modules/attendance/repository.ts`
- Modify: `apps/api/src/modules/attendance/services/report-absence.ts`
- Modify: `apps/api/tests/helpers/in-memory-attendance-repository.ts`
- Modify: `apps/api/tests/unit/attendance/services.test.ts`
- Modify: `apps/api/tests/integration/postgres-attendance-notifications.test.ts`
- Modify: `apps/api/src/modules/notifications/repository.ts`
- Modify: `apps/api/tests/helpers/in-memory-notifications-repository.ts`
- Modify: `apps/api/src/index.ts`
- Delete: `apps/api/src/modules/notifications/config.ts`
- Delete: `apps/api/src/modules/notifications/discord-client.ts`
- Delete: `apps/api/src/modules/notifications/discord-content.ts`
- Delete: `apps/api/src/modules/notifications/worker.ts`
- Delete: `apps/api/tests/unit/notifications/config.test.ts`
- Delete: `apps/api/tests/unit/notifications/discord-client.test.ts`
- Delete: `apps/api/tests/unit/notifications/worker.test.ts`
- Modify: `.env.example`
- Modify: `docker-compose.yml`

**Interfaces:**
- `AbsenceEvent` becomes `{ attendance: AttendanceRecord; notification: NotificationRecord }`.
- `NotificationRepository` keeps `listForUser` and `markRead`; no active repository method claims or delivers Discord records.
- `createApiApp` still receives `notifications` for internal reads, while `startApi` no longer parses a Bot token, creates a notifier, or starts a Discord worker.

- [ ] **Step 1: Write the failing absence regression test.**

Change the service test to express the new behavior before changing production code:

```ts
it('reports an absence with one in-app notification and no Discord delivery', async () => {
  const repository = createInMemoryAttendanceRepository({ sessions: [{ ...session, memberStatuses: { 'player-1': 'ACTIVE' } }] })
  const result = await reportAbsence({ sessionId: 'session-1', userId: 'player-1', repository, now: () => new Date('2026-09-06T12:00:00.000Z') })

  expect(result.attendance.status).toBe('EXCUSED')
  expect(result.notification).toMatchObject({ type: 'ABSENCE_REPORTED', recipientId: 'gm-1' })
  expect('delivery' in result).toBe(false)
  expect(repository.notifications).toHaveLength(1)
  expect(repository.deliveries).toHaveLength(0)
})
```

- [ ] **Step 2: Run the focused attendance service test to verify Red.**

Run: `pnpm exec vitest run apps/api/tests/unit/attendance/services.test.ts`

Expected: FAIL because the current repository still creates and returns a `DISCORD_DM` delivery.

- [ ] **Step 3: Implement the minimal removal.**

Remove Discord IDs and content generation from `SessionContext`/attendance persistence, insert only the `notifications` row, and simplify test repositories. Retain the historical `notification_deliveries` table/schema and migration files but make no new writes. Remove Bot configuration from Compose and leave OAuth variables untouched.

- [ ] **Step 4: Run all attendance/notification tests to verify Green.**

Run: `pnpm exec vitest run packages/shared/tests/attendance.test.ts apps/api/tests/unit/attendance apps/api/tests/api/attendance/routes.test.ts apps/api/tests/api/notifications/routes.test.ts apps/api/tests/integration/postgres-attendance-notifications.test.ts`

Expected: PASS; absence remains idempotent and visible in-app, and no worker/notifier code is imported by API startup.

- [ ] **Step 5: Commit the behavior replacement.**

```bash
git add packages/shared/src/attendance.ts packages/shared/tests/attendance.test.ts apps/api/src/modules/attendance apps/api/src/modules/notifications/repository.ts apps/api/tests/helpers/in-memory-attendance-repository.ts apps/api/tests/helpers/in-memory-notifications-repository.ts apps/api/tests/unit/attendance apps/api/tests/api/attendance apps/api/tests/api/notifications apps/api/tests/integration/postgres-attendance-notifications.test.ts apps/api/src/index.ts .env.example docker-compose.yml
git commit -m "refactor: keep absence notifications in app"
```

### Task 3: Implement message authorization, pagination, and persistence services

**Files:**
- Create: `apps/api/src/modules/messages/policy.ts`
- Create: `apps/api/src/modules/messages/repository.ts`
- Create: `apps/api/src/modules/messages/services/list-messages.ts`
- Create: `apps/api/src/modules/messages/services/create-message.ts`
- Create: `apps/api/tests/helpers/in-memory-messages-repository.ts`
- Test: `apps/api/tests/unit/messages/policy.test.ts`
- Test: `apps/api/tests/unit/messages/services.test.ts`

**Interfaces:**

```ts
type MessageAccess = {
  gameId: string
  gameStatus: 'OPEN' | 'ACTIVE' | 'CLOSED' | 'COMPLETED'
  isOwner: boolean
  memberStatus: 'ACTIVE' | 'REMOVED' | 'NONE'
  canRead: boolean
  canWrite: boolean
}

type MessageRecord = {
  id: string
  gameId: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  content: string
  createdAt: Date
}

interface GameMessageRepository {
  getAccess(input: { gameIdOrSlug: string; userId: string }): Promise<MessageAccess | null>
  list(input: { gameId: string; userId: string; cursor: string | null; limit: number }): Promise<{ items: MessageRecord[]; nextCursor: string | null }>
  findById(input: { gameId: string; messageId: string }): Promise<MessageRecord | null>
  create(input: { gameIdOrSlug: string; authorId: string; content: string; now: Date }): Promise<MessageRecord>
}
```

- [ ] **Step 1: Write failing policy tests.**

Cover owner/member read/write, closed/completed read-only, removed/candidate/outsider denial, and `DRAFT` denial. Use explicit cases such as:

```ts
expect(canReadGameMessages({ gameStatus: 'ACTIVE', isOwner: false, memberStatus: 'ACTIVE' })).toBe(true)
expect(canWriteGameMessages({ gameStatus: 'CLOSED', isOwner: true, memberStatus: 'ACTIVE' })).toBe(false)
expect(canReadGameMessages({ gameStatus: 'ACTIVE', isOwner: false, memberStatus: 'REMOVED' })).toBe(false)
```

- [ ] **Step 2: Run policy tests and verify Red.**

Run: `pnpm exec vitest run apps/api/tests/unit/messages/policy.test.ts`

Expected: FAIL because the message policy module does not exist.

- [ ] **Step 3: Implement policy and service tests.**

Add tests for first-page listing, stable cursor continuation, owner-created message without a `game_members` row, active member creation, and rejection of closed-game writes. Assert the author always comes from `authorId`, never from a command field.

- [ ] **Step 4: Run service tests and verify the missing repository/service failures.**

Run: `pnpm exec vitest run apps/api/tests/unit/messages/policy.test.ts apps/api/tests/unit/messages/services.test.ts`

Expected: policy tests pass only after implementation; service tests fail until repository/service functions are added.

- [ ] **Step 5: Implement the Drizzle repository.**

Resolve `gameIdOrSlug` to the internal UUID. Join `games`, `game_members`, and `users` for access/projection. Encode/decode the cursor from `{ createdAt, id }` using base64url and reject malformed cursors with `MESSAGE_INVALID_CURSOR`. For creation, lock the game row, re-check the status and active membership, insert the message, and return the author projection. Never select `users.discordId`.

- [ ] **Step 6: Implement services and make unit tests Green.**

`listMessages` calls `getAccess`, rejects unauthorized access, then returns a serialized page with `canWrite`; `createMessage` calls the strict command at the handler boundary, re-checks write access through the repository transaction, and returns the new record. The service accepts an event-bus dependency only at the API wiring stage; publication is attempted after persistence and any Redis failure is swallowed after recording a server-safe diagnostic counter, so a durable message is never reported as failed because Redis is unavailable.

- [ ] **Step 7: Run focused Green and commit.**

Run: `pnpm exec vitest run apps/api/tests/unit/messages/policy.test.ts apps/api/tests/unit/messages/services.test.ts`

Expected: all message policy/service tests pass without changing their assertions.

```bash
git add apps/api/src/modules/messages/policy.ts apps/api/src/modules/messages/repository.ts apps/api/src/modules/messages/services apps/api/tests/helpers/in-memory-messages-repository.ts apps/api/tests/unit/messages
git commit -m "feat: authorize and persist game messages"
```

### Task 4: Add the Redis Streams event bus

**Files:**
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/api/src/modules/messages/config.ts`
- Create: `apps/api/src/modules/messages/event-bus.ts`
- Create: `apps/api/src/modules/messages/redis-event-bus.ts`
- Create: `apps/api/tests/helpers/in-memory-message-event-bus.ts`
- Test: `apps/api/tests/unit/messages/config.test.ts`
- Test: `apps/api/tests/unit/messages/event-bus.test.ts`

**Interfaces:**

```ts
export type GameMessageCreatedEvent = { gameId: string; messageId: string }
export type StreamMessageEvent = GameMessageCreatedEvent & { streamId: string }

export interface GameMessageEventBus {
  publish(event: GameMessageCreatedEvent): Promise<void>
  subscribe(input: {
    gameId: string
    afterStreamId: string | null
    signal: AbortSignal
    onEvent: (event: StreamMessageEvent) => Promise<void>
  }): Promise<void>
}
```

- [ ] **Step 1: Add the dependency only after the already-approved Redis design.**

Run the supply-chain review available in the environment; if no auditor is available, record that limitation in the feature fiche. Add the official `redis` package with pnpm, inspect the lockfile diff, and do not add a second Redis client.

- [ ] **Step 2: Write failing config/event-bus tests.**

Test that `parseMessageConfig` accepts `redis://redis:6379`, accepts `rediss://...`, and rejects missing or non-Redis URLs. Test the in-memory bus publishes only to the requested game and stops delivering after `AbortController.abort()`.

- [ ] **Step 3: Run the focused tests to verify Red.**

Run: `pnpm exec vitest run apps/api/tests/unit/messages/config.test.ts apps/api/tests/unit/messages/event-bus.test.ts`

Expected: FAIL because message config, event-bus contract, and implementations do not exist.

- [ ] **Step 4: Implement config and in-memory behavior.**

Parse `REDIS_URL` once from the startup environment; do not read `process.env` inside handlers, repositories, or the event bus. Keep the in-memory bus test-only.

- [ ] **Step 5: Implement Redis Streams publishing/subscription.**

Create one publisher client lazily and a duplicated blocking reader per SSE subscription. Use `XADD game-messages:{gameId} MAXLEN ~ 10000 * game_id <id> message_id <id>`. Validate Redis stream IDs with `^\d+-\d+$`, use `XREAD BLOCK` from the supplied ID or `$`, close duplicated clients in `finally`, and propagate abort without logging message content. Redis errors are surfaced to the SSE handler, while the message create use case will persist successfully even if publish fails.

- [ ] **Step 6: Run unit tests and commit.**

Run: `pnpm exec vitest run apps/api/tests/unit/messages/config.test.ts apps/api/tests/unit/messages/event-bus.test.ts`

Expected: PASS for configuration and event-bus contract tests.

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/modules/messages/config.ts apps/api/src/modules/messages/event-bus.ts apps/api/src/modules/messages/redis-event-bus.ts apps/api/tests/helpers/in-memory-message-event-bus.ts apps/api/tests/unit/messages/config.test.ts apps/api/tests/unit/messages/event-bus.test.ts
git commit -m "feat: relay game messages with redis streams"
```

### Task 5: Expose REST and SSE API routes

**Files:**
- Create: `apps/api/src/modules/messages/handlers.ts`
- Create: `apps/api/src/modules/messages/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/tests/api/messages/routes.test.ts`

**Interfaces:**
- `GET /games/:gameId/messages?limit=20&cursor=...` returns `{ data: { items, nextCursor, canWrite }, error: null, meta }`.
- `POST /games/:gameId/messages` accepts only `{ content }`, requires the configured Origin, and returns `201` with one message projection.
- `GET /games/:gameId/messages/stream` returns `text/event-stream`, requires authentication/resource read access, supports `Last-Event-ID`, and emits `event: message` with the persisted message projection.
- `MessagesDependencies` contains `authConfig`, `authRepository`, `repository`, `eventBus`, and optional `now`.

- [ ] **Step 1: Write failing API tests.**

Cover unauthenticated GET/POST/SSE, missing trusted origin for POST, strict unknown-field rejection, active member read/write, owner access, removed-member denial, closed-game read-only, 429 after 30 writes per minute, generic persistence errors, successful `201` when Redis publication fails after persistence, SSE headers, access revalidation after removal, and message event serialization without `discord` or raw error text.

Use a test assertion shaped like:

```ts
const response = await app.request('/games/game-1/messages', {
  method: 'POST',
  headers: { cookie: member.cookie, origin: config.appOrigin, 'content-type': 'application/json' },
  body: JSON.stringify({ content: '  On joue jeudi.  ' }),
})
expect(response.status).toBe(201)
expect((await response.json()).data.content).toBe('On joue jeudi.')
```

- [ ] **Step 2: Run the API test to verify Red.**

Run: `pnpm exec vitest run apps/api/tests/api/messages/routes.test.ts`

Expected: FAIL because message routes are not registered.

- [ ] **Step 3: Implement handlers and route registration.**

Authenticate from the existing access cookie. Validate the path parameter as non-empty and allow the repository to resolve UUID or slug. Return French-safe stable errors (`MESSAGE_ERROR`) with the existing `requestId`. Apply a per-user write limiter of 30 requests per minute and an SSE connection limit of 5 active connections per user/game. Call `streamSSE` only after authentication and authorization; send a heartbeat every 15 seconds, re-check access on every heartbeat and before every event, close the stream after a revoked membership, cancel the subscription on stream abort, and clear timers in `finally`.

- [ ] **Step 4: Wire the production dependencies.**

Create the Redis event bus from parsed `REDIS_URL` in `startApi`, inject it into `createApiApp`, and keep `migrateDatabase` before serving traffic. Do not reintroduce a Discord notifier or Bot configuration.

- [ ] **Step 5: Run API tests Green and commit.**

Run: `pnpm exec vitest run apps/api/tests/api/messages/routes.test.ts apps/api/tests/api/app.test.ts`

Expected: all route/auth/error/SSE tests pass, including the existing app security-header tests.

```bash
git add apps/api/src/modules/messages/handlers.ts apps/api/src/modules/messages/routes.ts apps/api/src/app.ts apps/api/src/index.ts apps/api/tests/api/messages/routes.test.ts
git commit -m "feat: expose game messaging api"
```

### Task 6: Verify PostgreSQL/Redis integration and Docker configuration

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker/Caddyfile`
- Modify: `.env.example`
- Modify: `vitest.integration.config.ts`
- Modify: `vitest.config.ts`
- Create: `apps/api/tests/integration/postgres-game-messaging.test.ts`
- Create: `apps/api/tests/integration/redis-game-messaging.test.ts`
- Test: `packages/database/tests/game-messages-schema.test.ts`

**Interfaces:**
- Compose adds a pinned Redis image on the internal `database-internal` network with `redis-cli ping` healthcheck and no published port.
- `api-hono` receives `REDIS_URL=redis://redis:6379` and no `DISCORD_BOT_TOKEN`; the proxy keeps streaming responses unbuffered with `flush_interval -1` for `/api/*`.
- Integration tests receive `DATABASE_URL` and `REDIS_URL` explicitly; they never load `.env`.

- [ ] **Step 1: Write failing integration tests.**

PostgreSQL tests must create synthetic users/games/members, run migrations, verify owner/member access, closed read-only, removed denial, stable pagination, 2,000-character limit, and message cleanup. Redis tests must publish an event, subscribe from a stream ID, receive only the target game, and stop on abort.

- [ ] **Step 2: Run integration tests against the configured services to verify Red.**

Run: `DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test REDIS_URL=redis://127.0.0.1:16379 pnpm test:integration`

Expected: FAIL before the Compose Redis service/configuration and integration implementations are present.

- [ ] **Step 3: Add the internal Redis service and streaming proxy configuration.**

Use a pinned digest for the Redis image, expose no host port in development Compose, add `depends_on` health ordering, and keep the database network internal. Integration tests use a separate ephemeral Redis container bound only to loopback port `16379`; that test port is never added to the application Compose file. Set Caddy's API reverse proxy to flush streaming responses. Remove the Bot token from `.env.example` and Compose while retaining Discord OAuth variables.

- [ ] **Step 4: Run migrations and integration tests Green.**

Start the dedicated development services with dummy OAuth values only. Run the integration suite serially so migration files cannot race:

```bash
DISCORD_CLIENT_ID=123456789012345678 DISCORD_CLIENT_SECRET=local-test-only-secret JWT_SIGNING_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA docker compose -f docker-compose.yml up --build --wait --wait-timeout 120
DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test REDIS_URL=redis://127.0.0.1:16379 pnpm test:integration
```

Expected: PostgreSQL and Redis integration files pass; no test creates a Discord delivery; Compose healthchecks are healthy.

- [ ] **Step 5: Commit infrastructure and integration evidence.**

```bash
git add docker-compose.yml docker/Caddyfile .env.example vitest.integration.config.ts vitest.config.ts apps/api/tests/integration/postgres-game-messaging.test.ts apps/api/tests/integration/redis-game-messaging.test.ts
git commit -m "test: verify game messaging integrations"
```

### Task 7: Build the responsive frontend chat

**Files:**
- Create: `apps/web/lib/game-messages-api.ts`
- Create: `apps/web/features/messages/game-chat-view.tsx`
- Modify: `apps/web/features/games/game-detail-view.tsx`
- Test: `apps/web/tests/game-messages-api.test.ts`
- Test: `apps/web/tests/game-chat-visual.test.ts`

**Interfaces:**
- `createGameMessagesApi({ baseUrl, origin, fetcher, eventSourceFactory })` exposes `getMessages(gameId, query)`, `sendMessage(gameId, content)`, and `subscribe(gameId, { lastEventId, onMessage, onError })`.
- The client uses `credentials: 'include'`; POST sends the browser origin and body `{ content }`; `EventSource` uses `withCredentials: true` and no token in a URL/query string.
- `GameChatView({ gameId }: { gameId: string })` loads with the public slug and displays the server-provided `canWrite` state.

- [ ] **Step 1: Write failing API-client tests.**

Assert encoded slug paths, credentialed GET, trimmed POST payload with trusted Origin, French-safe rejection on non-OK responses, and `EventSource` creation with `withCredentials: true` and no message content in the URL.

- [ ] **Step 2: Run the focused client test to verify Red.**

Run: `pnpm exec vitest run apps/web/tests/game-messages-api.test.ts`

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement the client and write failing visual tests.**

The visual test must assert that the component contains a labeled message input, send action, `aria-live="polite"` message region, loading/empty/error/read-only copy, and no `dangerouslySetInnerHTML` or Discord token references.

- [ ] **Step 4: Run the visual test to verify Red, then implement the component.**

Run: `pnpm exec vitest run apps/web/tests/game-chat-visual.test.ts`

Expected: FAIL until `GameChatView` exists. Implement the component with local state for page, send pending/error, EventSource lifecycle, reconnect fallback to REST, text-only rendering, focus-visible controls, and Tailwind tokens matching the existing game detail cards.

- [ ] **Step 5: Compose the chat into the existing game detail page.**

Place the chat below the synopsis/details grid and pass `game.slug`; do not add an exposed UUID to the public game contract. The API accepts the slug and resolves the internal UUID. Keep public pages server-rendered and keep all browser interaction inside the client component.

- [ ] **Step 6: Run web tests and commit.**

Run: `pnpm exec vitest run apps/web/tests/game-messages-api.test.ts apps/web/tests/game-chat-visual.test.ts apps/web/tests/games-pages.test.ts`

Expected: all chat and existing game detail tests pass.

```bash
git add apps/web/lib/game-messages-api.ts apps/web/features/messages/game-chat-view.tsx apps/web/features/games/game-detail-view.tsx apps/web/tests/game-messages-api.test.ts apps/web/tests/game-chat-visual.test.ts
git commit -m "feat: add responsive game chat"
```

### Task 8: Update security matrix, feature tracking, and implementation documentation

**Files:**
- Create: `docs/features/015-game-messaging.md`
- Modify: `docs/features/013-attendance-notifications.md`
- Modify: `docs/project-status.md`
- Modify: `docs/security/authorization-matrix.md`
- Modify: `docs/implementation-plan.md`

**Interfaces:**
- Documentation records F07's dated transition from Discord delivery to internal notifications and F07B's complete chat behavior without claiming the feature is merged before its PR is merged.
- Authorization matrix includes dashboard-independent game message read/write access, closed-game read-only, and immediate denial after removal.

- [ ] **Step 1: Write documentation checks or failing assertions if the repository has a documentation test.**

Assert the feature fiche contains `IN_PROGRESS` before PR creation, the branch name, exact route list, Red/Green/Refactor evidence, security checks, limitations, and no secret-like values. Assert project status has one F07B row and no `MERGED` claim.

- [ ] **Step 2: Run the documentation test to verify Red.**

Run: `pnpm exec vitest run tests/infrastructure/documentation.test.ts`

Expected: FAIL because the F07B fiche and status row do not exist.

- [ ] **Step 3: Write the factual documentation.**

Record migration `0008_game_messages`, REST/SSE/Redis behavior, authorization cases, absence fallback, dependency review, exact test commands/results, no coverage metric if none was run, no real-browser E2E if unavailable, and the manual desktop/mobile verification scenario. Add the security matrix rows and a dated F07 update rather than silently rewriting a merged historical description.

- [ ] **Step 4: Run the documentation test and diff checks.**

Run: `pnpm exec vitest run tests/infrastructure/documentation.test.ts && git diff --check`

Expected: PASS with no whitespace errors and no undocumented secret/config value.

- [ ] **Step 5: Commit documentation.**

```bash
git add docs/features/015-game-messaging.md docs/features/013-attendance-notifications.md docs/project-status.md docs/security/authorization-matrix.md docs/implementation-plan.md
git commit -m "docs: track in-app game messaging"
```

### Task 9: Full verification and delivery preparation

**Files:**
- No new production files; inspect the complete branch diff and all untracked files.

- [ ] **Step 1: Run the complete unit/API/component suite.**

Run: `pnpm test -- --reporter=dot`

Expected: all tests pass, including the absence regression showing no Discord delivery and all new message tests.

- [ ] **Step 2: Run PostgreSQL/Redis integration with explicit synthetic environment.**

Run: `DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test REDIS_URL=redis://127.0.0.1:16379 pnpm test:integration`

Expected: all integration files pass serially.

- [ ] **Step 3: Run static checks and production builds.**

Run: `pnpm lint && pnpm typecheck && pnpm build`

Expected: API, web, shared, database lint/typecheck/build all pass; Next.js generates the new game-detail route without CSS architecture violations.

- [ ] **Step 4: Run final security/diff checks.**

Run: `git diff --check develop...HEAD`, `git status --short --untracked-files=all`, and a scoped search excluding forbidden environment files:

```bash
rg -n --hidden --glob '!.env' --glob '!.env.*' --glob '!node_modules/**' --glob '!**/dist/**' 'DISCORD_BOT_TOKEN|DATABASE_URL=postgresql://|JWT_SIGNING_SECRET=|dangerouslySetInnerHTML' apps packages docs docker-compose.yml .env.example
```

Expected: clean Git status after commit, no secrets, no unapproved destructive migration, no raw HTML rendering, and no Bot token requirement in runtime configuration.

- [ ] **Step 5: Perform the manual verification scenario.**

With synthetic accounts, verify desktop/mobile game detail chat, empty/loading/error states, sending, live receipt from a second session, pagination, closed-game read-only, immediate denial after roster removal, and absence notification in the in-app bell. Confirm no Discord server has to contain the users or bot.

- [ ] **Step 6: Update the feature status only after PR creation.**

Before PR: keep `docs/features/015-game-messaging.md` and `docs/project-status.md` at `IN_PROGRESS`. Push `feat/game-messaging`, open a PR targeting `develop`, then make a small follow-up documentation commit changing only F07B to `IN_REVIEW` and adding the PR link. Never merge the PR or mark it `MERGED`.
