# XP and Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attribuer exactement `+100 XP` aux participants présents lors de la validation d’une séance, calculer les niveaux depuis un journal idempotent et exposer l’historique privé dans l’API, le dashboard et `/profil/xp`.

**Architecture:** Le module `gamification` possède les règles XP, le repository du journal et le service d’historique. Le repository PostgreSQL de présence reçoit une dépendance d’attribution XP exécutée avec son objet transactionnel Drizzle, afin que la validation de séance, les événements `xp_events` et les projections `users.xp`/`users.level` soient atomiques. Le dashboard réutilise les projections utilisateur pour remplir son bloc de progression ; l’historique passe par une route privée dédiée.

**Tech Stack:** pnpm monorepo, TypeScript strict, Hono, Next.js App Router, Drizzle ORM, PostgreSQL, Zod, Vitest, Tailwind CSS v4, Lucide Icons.

**Spec:** `docs/superpowers/specs/2026-09-08-xp-and-levels-design.md`

## Global Constraints

- L’XP est attribuée uniquement côté serveur après validation autorisée d’une séance.
- `xp_events` est la source d’audit ; `users.xp` et `users.level` sont des projections recalculées dans la transaction.
- Une validation rejouée ne doit jamais créer de doublon ; la contrainte DB et la clé `session-attended:<sessionId>:<userId>` sont obligatoires.
- Les présences `ABSENT`, `EXCUSED` et les utilisateurs absents de la validation ne reçoivent aucune XP.
- Les routes API ne font ni accès direct Drizzle dans le frontend, ni confiance aux champs `userId`, `xp`, `level`, `amount` ou `reason` du client.
- Toute entrée HTTP est validée par Zod strict, avec pagination bornée à 50 éléments.
- Les erreurs visibles restent en français et ne révèlent ni exception brute, SQL, secret, token, cookie, identifiant Discord ni donnée d’un autre utilisateur.
- Le frontend reste Tailwind-only dans `apps/web/app/globals.css` et les composants TSX ; aucune feuille CSS ou style inline n’est ajouté.
- Les tests existants ne sont ni affaiblis, ni supprimés, ni ignorés.
- Les secrets, `.env`, données de production et fichiers interdits par `docs/security/ai-access-policy.md` ne sont jamais lus ou modifiés.

## File Map

- `packages/shared/src/xp.ts` : schémas, types, récompense MVP, seuils et calculs purs.
- `packages/database/src/schema/gamification.ts` : table `xp_events` et index Drizzle.
- `packages/database/src/schema/auth.ts` : projections `users.xp` et `users.level`.
- `packages/database/src/index.ts`, migrations `0009_xp.sql` et métadonnées : exposition et migration additive.
- `apps/api/src/modules/gamification/` : policy, repository, services, handlers et routes.
- `apps/api/src/modules/attendance/repository.ts` : injection de l’attribution XP dans la transaction existante.
- `apps/api/src/app.ts`, `apps/api/src/index.ts` : enregistrement des routes et dépendances.
- `apps/api/tests/unit/gamification/`, `apps/api/tests/api/gamification/`, `apps/api/tests/integration/` : tests métier, transport et PostgreSQL.
- `apps/web/lib/xp-api.ts`, `apps/web/features/xp/`, `apps/web/app/profil/xp/page.tsx` : client, composants et page d’historique.
- `apps/web/features/dashboard/dashboard-view.tsx`, `packages/shared/src/dashboard.ts` : progression dans le dashboard.
- `docs/features/015-xp-and-levels.md`, `docs/project-status.md` : suivi F09 et résultats.

---

### Task 1: Define XP rules and shared contracts

**Files:**
- Create: `packages/shared/src/xp.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/xp.test.ts`

**Interfaces:**
- Produces `XP_REWARDS.SESSION_ATTENDED = 100`, `XP_LEVEL_THRESHOLDS`, `calculateLevel(totalXp)`, `calculateProgress(totalXp)`, `xpReasonSchema`, `xpEventSchema`, `xpSummarySchema`, `xpHistoryQuerySchema` and `xpHistoryPageSchema`.
- `XpSummary` contains `totalXp`, `level`, `currentLevelXp`, `nextLevelXp: number | null` and `progressPercent`.
- `XpEvent` exposes only `id`, `sessionId: string | null`, `amount`, `reason`, and `createdAt`.

- [ ] **Step 1: Write the failing tests**

```ts
it('calculates the highest reached level and bounded progress', () => {
  expect(calculateLevel(0)).toBe(1)
  expect(calculateLevel(250)).toBe(2)
  expect(calculateLevel(1_750)).toBe(5)
  expect(calculateProgress(300)).toEqual({ currentLevelXp: 250, nextLevelXp: 600, progressPercent: 14 })
})

it('rejects unknown reasons, negative amounts and oversized history limits', () => {
  expect(xpReasonSchema.safeParse('MANUAL_BONUS').success).toBe(false)
  expect(xpEventSchema.safeParse({ id: 'x', sessionId: null, amount: 0, reason: 'SESSION_ATTENDED', createdAt: new Date().toISOString() }).success).toBe(false)
  expect(xpHistoryQuerySchema.safeParse({ limit: 51 }).success).toBe(false)
})
```

- [ ] **Step 2: Run the focused test and verify the expected red state**

Run: `pnpm exec vitest run packages/shared/tests/xp.test.ts`

Expected: FAIL because `packages/shared/src/xp.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal pure rules and strict schemas**

Use ascending thresholds `{ level: 1, xp: 0 }`, `{ level: 2, xp: 250 }`, `{ level: 3, xp: 600 }`, `{ level: 4, xp: 1100 }`, `{ level: 5, xp: 1750 }`. For totals above the final threshold, keep the same interval size as the last interval when calculating the next threshold. Default `limit` to 20 and cap it at 50. Keep `cursor` opaque and bounded to 256 characters.

- [ ] **Step 4: Run the focused tests and typecheck shared**

Run: `pnpm exec vitest run packages/shared/tests/xp.test.ts && pnpm --filter @jdr-hub/shared typecheck`

Expected: PASS with all XP rule tests green.

- [ ] **Step 5: Commit the shared contract**

```bash
git add packages/shared/src/xp.ts packages/shared/src/index.ts packages/shared/tests/xp.test.ts
git commit -m "feat: define xp rules and contracts"
```

### Task 2: Add the XP schema and migration

**Files:**
- Modify: `packages/database/src/schema/auth.ts`
- Create: `packages/database/src/schema/gamification.ts`
- Modify: `packages/database/src/index.ts`
- Create via Drizzle generation: `packages/database/migrations/0009_xp.sql`
- Create via Drizzle generation: `packages/database/migrations/meta/0009_snapshot.json`
- Modify via Drizzle generation: `packages/database/migrations/meta/_journal.json`
- Test: `packages/database/tests/gamification-schema.test.ts`

**Interfaces:**
- `gamificationSchema.xpEvents` has `id`, `userId`, nullable `sessionId`, `amount`, `reason`, `idempotencyKey`, `createdAt`.
- `users.xp` defaults to `0`; `users.level` defaults to `1`.
- `xp_events.idempotency_key` is unique; `(user_id, created_at, id)` and `session_id` are indexed.

- [ ] **Step 1: Write schema and migration assertions first**

```ts
it('exports xp projections and the idempotent xp event table', () => {
  expect(authSchema.users.xp).toBeDefined()
  expect(authSchema.users.level).toBeDefined()
  expect(gamificationSchema.xpEvents).toBeDefined()
})

it('keeps XP amount positive and idempotency key unique in the migration', () => {
  const migration = readFileSync(resolve(migrations, '0009_xp.sql'), 'utf8')
  expect(migration).toContain('xp_events_idempotency_key_unique')
  expect(migration).toMatch(/amount.*CHECK/i)
})
```

- [ ] **Step 2: Run the focused test and verify the expected red state**

Run: `pnpm exec vitest run packages/database/tests/gamification-schema.test.ts`

Expected: FAIL because the schema and migration do not exist.

- [ ] **Step 3: Implement the Drizzle schema**

Use `integer('xp').notNull().default(0)` and `integer('level').notNull().default(1)` on `users`. Use `uuid` foreign keys for `user_id` and `session_id`, a positive integer amount, a bounded `varchar` reason, a bounded unique `varchar` idempotency key, and timestamp defaults. Export `gamificationSchema` and include it in the database schema passed to Drizzle.

- [ ] **Step 4: Generate and inspect migration 0009**

Run: `pnpm --filter @jdr-hub/database db:generate`

Expected: one additive migration for the user columns, `xp_events`, constraints and indexes. Inspect the generated SQL and metadata; do not hand-edit a snapshot to hide a schema difference.

- [ ] **Step 5: Run schema tests and database typecheck**

Run: `pnpm exec vitest run packages/database/tests/gamification-schema.test.ts && pnpm --filter @jdr-hub/database typecheck`

Expected: PASS with no destructive migration and no TypeScript errors.

- [ ] **Step 6: Commit the schema**

```bash
git add packages/database/src/schema packages/database/src/index.ts packages/database/migrations packages/database/tests/gamification-schema.test.ts
git commit -m "feat: add xp event persistence"
```

### Task 3: Implement pure attribution and history services

**Files:**
- Create: `apps/api/src/modules/gamification/policy.ts`
- Create: `apps/api/src/modules/gamification/repository.ts`
- Create: `apps/api/src/modules/gamification/services/award-session-xp.ts`
- Create: `apps/api/src/modules/gamification/services/get-xp-history.ts`
- Create: `apps/api/src/modules/gamification/services/calculate-level.ts`
- Test: `apps/api/tests/unit/gamification/services.test.ts`
- Test helper: `apps/api/tests/helpers/in-memory-gamification-repository.ts`

**Interfaces:**
- `GamificationRepository.awardSessionXp(input: { tx: Transaction; sessionId: string; userIds: string[]; now: Date }): Promise<void>`.
- `GamificationRepository.getSummary(userId: string): Promise<XpSummary>`.
- `GamificationRepository.listEvents(input: { userId: string; cursor: XpCursor | null; limit: number }): Promise<{ items: XpEvent[]; nextCursor: XpCursor | null }>`.
- `awardSessionXp` derives amount and reason from `XP_REWARDS`; it accepts no client-provided XP fields.
- `getXpHistory({ userId, query, repository })` validates the bounded query, reads only the authenticated user’s projection and returns the shared page type.

- [ ] **Step 1: Write failing unit tests**

```ts
it('awards one event per present participant and excludes non-present users', async () => {
  const repository = createInMemoryGamificationRepository()
  await awardSessionXp({ sessionId: 'session-1', presentUserIds: ['user-1'], tx: repository, now })
  expect(repository.events).toMatchObject([{ userId: 'user-1', amount: 100, reason: 'SESSION_ATTENDED' }])
  expect(repository.events).not.toContainEqual(expect.objectContaining({ userId: 'user-2' }))
})

it('is idempotent for the same session and user', async () => {
  const repository = createInMemoryGamificationRepository()
  await awardSessionXp({ sessionId: 'session-1', presentUserIds: ['user-1'], tx: repository, now })
  await awardSessionXp({ sessionId: 'session-1', presentUserIds: ['user-1'], tx: repository, now })
  expect(repository.events).toHaveLength(1)
})

it('paginates only the authenticated user history', async () => {
  const page = await getXpHistory({ userId: 'user-1', query: { limit: 20 }, repository })
  expect(page.items.every((event) => event.userId === undefined)).toBe(true)
  expect(page.summary.totalXp).toBe(100)
})
```

- [ ] **Step 2: Run the focused tests and verify the expected red state**

Run: `pnpm exec vitest run apps/api/tests/unit/gamification/services.test.ts`

Expected: FAIL because the service, repository contract and helper do not exist.

- [ ] **Step 3: Implement the repository contract and in-memory adapter**

Define a shared Drizzle transaction type from the database package rather than using `any`. The in-memory adapter uses a `Map` keyed by `sessionId:userId:SESSION_ATTENDED`, recomputes totals from its event list and returns cursor pages in descending creation order.

- [ ] **Step 4: Implement idempotent attribution**

Build the idempotency key as `session-attended:${sessionId}:${userId}`. Insert with `onConflictDoNothing`, sum all events for each affected user inside the same transaction, calculate the level, and update the user projection. Never accept amount, reason or beneficiary from the service caller beyond the validated participant list.

- [ ] **Step 5: Implement bounded private history**

Decode and encode a cursor containing `createdAt` and `id` with a stable opaque representation. Query by the authenticated user only, order by `createdAt DESC, id DESC`, fetch `limit + 1`, and return at most `limit` items. Translate no user content in the repository; keep reason translation in the web feature.

- [ ] **Step 6: Run unit tests and API typecheck**

Run: `pnpm exec vitest run apps/api/tests/unit/gamification/services.test.ts && pnpm --filter @jdr-hub/api typecheck`

Expected: PASS with idempotence, threshold and pagination tests green.

- [ ] **Step 7: Commit the gamification services**

```bash
git add apps/api/src/modules/gamification apps/api/tests/unit/gamification apps/api/tests/helpers/in-memory-gamification-repository.ts
git commit -m "feat: implement xp attribution services"
```

### Task 4: Make session validation atomically award XP

**Files:**
- Modify: `apps/api/src/modules/attendance/repository.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/tests/integration/postgres-attendance-notifications.test.ts`
- Test: `apps/api/tests/integration/postgres-xp.test.ts`
- Test: existing attendance unit/API tests when constructor dependencies change

**Interfaces:**
- `createPostgresAttendanceRepository(database, { awardSessionXp })` invokes the injected callback with the active Drizzle transaction only after attendance rows are valid and before the transaction commits.
- `awardSessionXp({ tx, sessionId, presentUserIds, now })` is called exactly once for a new completion and never for an identical completed-session retry.

- [ ] **Step 1: Add failing PostgreSQL integration tests**

```ts
it('completes a session and awards XP atomically to PRESENT users', async () => {
  const records = await validateAttendance({ sessionId, actorId: ownerId, entries: [{ userId: memberId, status: 'PRESENT' }], repository, now: () => now })
  expect(records[0]?.status).toBe('PRESENT')
  expect(await readUserXp(memberId)).toEqual({ xp: 100, level: 1 })
  expect(await countXpEvents(memberId)).toBe(1)
})

it('replaying the same validation does not duplicate XP', async () => {
  await validateAttendance(input)
  await validateAttendance(input)
  expect(await countXpEvents(memberId)).toBe(1)
  expect(await readUserXp(memberId)).toEqual({ xp: 100, level: 1 })
})

it('rolls back attendance and XP when attribution fails', async () => {
  const failingRepository = createPostgresAttendanceRepository(database.db, { awardSessionXp: async () => { throw new Error('XP_FAILURE') } })
  await expect(validateAttendance({ ...input, repository: failingRepository })).rejects.toThrow('XP_FAILURE')
  expect(await readSessionStatus()).toBe('SCHEDULED')
  expect(await countXpEvents(memberId)).toBe(0)
})
```

- [ ] **Step 2: Run the focused integration suite and verify the expected red state**

Run: `DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test pnpm exec vitest run --config vitest.integration.config.ts apps/api/tests/integration/postgres-xp.test.ts`

Expected: FAIL because the migration, callback wiring and XP repository are not implemented.

- [ ] **Step 3: Inject the gamification callback into the attendance transaction**

Keep authorization and attendance validation in the attendance module. After the existing `sessionAttendance` writes and before returning from the transaction, call the injected XP callback with only `PRESENT` user IDs. On the already-completed identical path, return existing attendance without invoking the callback.

- [ ] **Step 4: Wire production dependencies**

Create the gamification repository once in `apps/api/src/index.ts`, pass its attribution method to `createPostgresAttendanceRepository`, and keep the explicit dependency flow `routes -> handlers -> services -> repositories`. Do not read environment variables from the new module.

- [ ] **Step 5: Run integration and all attendance tests**

Run: `DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test pnpm test:integration && pnpm exec vitest run apps/api/tests/unit/attendance apps/api/tests/api/attendance`

Expected: all existing attendance/notification tests and the new XP transaction tests pass.

- [ ] **Step 6: Commit the transaction integration**

```bash
git add apps/api/src/modules/attendance/repository.ts apps/api/src/index.ts apps/api/tests/integration/postgres-attendance-notifications.test.ts apps/api/tests/integration/postgres-xp.test.ts
git commit -m "feat: award xp during attendance validation"
```

### Task 5: Expose the private XP history API

**Files:**
- Create: `apps/api/src/modules/gamification/handlers.ts`
- Create: `apps/api/src/modules/gamification/routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/api/gamification/routes.test.ts`

**Interfaces:**
- `registerGamificationRoutes(app, { authConfig, authRepository, repository, now })` registers `GET /profile/xp`.
- The handler authenticates from the access cookie, parses only `limit` and `cursor`, and calls `getXpHistory` with the authenticated user ID.

- [ ] **Step 1: Write failing API tests**

```ts
it('requires a session and ignores a forged userId', async () => {
  expect((await app.request('/profile/xp')).status).toBe(401)
  const response = await app.request('/profile/xp?userId=other-user&limit=20', { headers: { cookie } })
  expect(response.status).toBe(200)
  expect((await response.json()).data.summary.totalXp).toBe(100)
})

it('rejects an oversized page and never exposes idempotency data', async () => {
  const response = await app.request('/profile/xp?limit=51', { headers: { cookie } })
  expect(response.status).toBe(400)
  const body = await (await app.request('/profile/xp', { headers: { cookie } })).json()
  expect(JSON.stringify(body)).not.toContain('idempotencyKey')
})
```

- [ ] **Step 2: Run the focused API tests and verify the expected red state**

Run: `pnpm exec vitest run apps/api/tests/api/gamification/routes.test.ts`

Expected: FAIL because the route is not registered.

- [ ] **Step 3: Implement handler and route composition**

Use the existing authentication cookie and envelope conventions. Map validation failures to a French 400 response, missing sessions to 401, and repository failures to a generic 500 response with `requestId`. Do not include raw errors or database fields.

- [ ] **Step 4: Run API tests and full typecheck**

Run: `pnpm exec vitest run apps/api/tests/api/gamification/routes.test.ts && pnpm typecheck`

Expected: PASS with authenticated, pagination and privacy assertions green.

- [ ] **Step 5: Commit the API route**

```bash
git add apps/api/src/modules/gamification/handlers.ts apps/api/src/modules/gamification/routes.ts apps/api/src/app.ts apps/api/tests/api/gamification/routes.test.ts
git commit -m "feat: expose private xp history api"
```

### Task 6: Populate dashboard progression and build the XP web feature

**Files:**
- Modify: `packages/shared/src/dashboard.ts`
- Modify: `apps/api/src/modules/dashboard/repository.ts`
- Modify: `apps/api/src/modules/dashboard/services/get-dashboard.ts`
- Modify: `apps/web/features/dashboard/dashboard-view.tsx`
- Create: `apps/web/lib/xp-api.ts`
- Create: `apps/web/features/xp/xp-progress-card.tsx`
- Create: `apps/web/features/xp/xp-history-view.tsx`
- Create: `apps/web/app/profil/xp/page.tsx`
- Test: `apps/web/tests/xp-api.test.ts`
- Test: `apps/web/tests/xp-visual.test.ts`
- Modify: dashboard API, route and visual tests for the populated progression block

**Interfaces:**
- `DashboardProgression` becomes `{ totalXp, level, currentLevelXp, nextLevelXp: number | null, progressPercent }`.
- `createXpApi().getHistory({ cursor, limit })` returns `XpHistoryPage | null` and always sends credentials with `cache: 'no-store'`.
- `XpProgressCard` receives an `XpSummary` and renders no fabricated values.
- `XpHistoryView` loads pages from `createXpApi`, translates known reasons (`SESSION_ATTENDED` → `Séance jouée`) and handles loading, empty, error and retry states.

- [ ] **Step 1: Write failing client and visual tests**

```ts
it('loads private XP history with a bounded query and session credentials', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: page, error: null }), { status: 200 }))
  await expect(createXpApi({ baseUrl: 'http://api.test/api', fetcher }).getHistory({ limit: 20 })).resolves.toEqual(page)
  expect(fetcher).toHaveBeenCalledWith('http://api.test/api/profile/xp?limit=20', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
})
```

```ts
it('renders progression and explicit empty/error states without inline CSS', () => {
  const source = readFileSync(resolve(web, 'features/xp/xp-history-view.tsx'), 'utf8')
  expect(source).toContain('role="status"')
  expect(source).toContain('role="alert"')
  expect(source).toContain('focus-visible:')
  expect(source).not.toContain('style={{')
})
```

- [ ] **Step 2: Run focused web tests and verify the expected red state**

Run: `pnpm exec vitest run apps/web/tests/xp-api.test.ts apps/web/tests/xp-visual.test.ts`

Expected: FAIL because the client, components and page do not exist.

- [ ] **Step 3: Populate the dashboard progression from the authenticated projection**

Extend the dashboard user/repository projection with `xp` and `level`, compute the summary using the shared pure rules, and return a `READY` progression block. Preserve the existing empty/error behavior for unrelated blocks and do not expose an XP mutation in the dashboard.

- [ ] **Step 4: Implement the XP API client and progress card**

Use the existing frontend client conventions. Encode cursor and limit with `URLSearchParams`, return `null` for transport failures, keep response errors out of visible text, and render the progress bar with an accessible label derived from the summary.

- [ ] **Step 5: Implement `/profil/xp` history**

Keep `app/profil/xp/page.tsx` as route composition only. Put fetching, pagination and visible states in `features/xp/xp-history-view.tsx`. Use buttons/links with 48px touch targets and French labels. Do not render an empty notification-like card when there are no XP events; show an explicit history empty state instead.

- [ ] **Step 6: Run web tests and build**

Run: `pnpm exec vitest run apps/web/tests/xp-api.test.ts apps/web/tests/xp-visual.test.ts apps/web/tests/dashboard-visual.test.ts && pnpm --filter @jdr-hub/web typecheck && pnpm --filter @jdr-hub/web build`

Expected: PASS with the progression and history states verified at compile time and in the structural tests.

- [ ] **Step 7: Commit the web feature**

```bash
git add packages/shared/src/dashboard.ts apps/api/src/modules/dashboard apps/web/lib/xp-api.ts apps/web/features/xp apps/web/app/profil/xp apps/web/tests apps/web/features/dashboard/dashboard-view.tsx
git commit -m "feat: display xp progression and history"
```

### Task 7: Update feature tracking and perform the complete verification

**Files:**
- Create: `docs/features/015-xp-and-levels.md`
- Modify: `docs/project-status.md`
- Modify: `docs/security/authorization-matrix.md`
- Modify: `docs/implementation-plan.md` only if the implemented decisions differ from the existing plan

- [ ] **Step 1: Write the F09 feature fiche**

Record only implemented behavior: branch, migration, routes, transaction/idempotence rules, tests, TDD Red/Green/Refactor evidence, security checks, limits and manual verification steps. Set status to `IN_PROGRESS` until a PR is actually open.

- [ ] **Step 2: Update the authorization matrix**

Document that a connected user can read only their own XP summary/history, that only the owner can validate attendance, and that no actor can directly write XP or level.

- [ ] **Step 3: Run all required verification commands**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test pnpm test:integration
git diff --check
git status --short
```

Expected: all commands exit 0, the integration suite reports the new XP transaction tests, no conflict markers or secrets are present, and the worktree contains only intentional changes.

- [ ] **Step 4: Review the final diff and security checklist**

Confirm that no client payload can set XP/level, no history query accepts another user ID, the unique idempotency key exists in PostgreSQL, the transaction rollback test passes, and the UI contains no CSS outside Tailwind classes.

- [ ] **Step 5: Commit documentation and verification results**

```bash
git add docs/features/015-xp-and-levels.md docs/project-status.md docs/security/authorization-matrix.md docs/implementation-plan.md
git commit -m "docs: track xp and levels feature"
```

- [ ] **Step 6: Push the dedicated branch and open the PR**

```bash
git push -u origin feat/xp-and-levels
```

Open the PR against `develop` only after the verification commands pass. Update the feature fiche status to `IN_REVIEW` only after GitHub confirms the PR exists. Never mark F09 `MERGED` before the owner confirms the merge.

## Plan Self-Review

- Spec coverage: journal, projection, thresholds, idempotence, atomic validation, private history, dashboard, profile page, security and tests are covered by Tasks 1–7.
- Placeholder scan: no implementation step depends on an unspecified file, endpoint or error mapping; deferred rewards are explicitly out of scope.
- Type consistency: `XpSummary`, `XpEvent`, `XpHistoryPage`, `awardSessionXp`, `getXpHistory` and `createXpApi().getHistory` are named consistently across tasks.
- Migration safety: the migration is additive, generated by Drizzle, inspected before integration testing, and has no destructive operation.
