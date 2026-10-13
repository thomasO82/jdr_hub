# F08 — Dashboard et gestion MJ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un dashboard authentifié joueur/MJ et une gestion MJ complète des candidatures, invitations, roster et séances.

**Architecture:** Un module `dashboard` expose un agrégateur par projections, exécutées indépendamment afin de conserver les blocs disponibles en cas d'erreur partielle. Les invitations et le roster disposent de modules spécialisés ; les actions existantes des candidatures et du scheduling sont réutilisées par leurs services et restent autorisées par ressource côté API.

**Tech Stack:** pnpm, TypeScript strict, Zod, Hono, Drizzle ORM, PostgreSQL, Next.js App Router, React, Tailwind CSS v4, Lucide Icons, Vitest et Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-06-dashboard-and-gm-management-design.md`

## Global Constraints

- Créer la branche `feat/dashboard-and-gm-management` depuis un `develop` propre et ne jamais développer directement sur `main`.
- Aucune dépendance nouvelle sans validation explicite et examen supply-chain.
- Les handlers Hono ne font que lire le transport, appeler les services et construire l'enveloppe HTTP.
- Les services métier ne dépendent ni de Hono ni de `Context`; les repositories sont la seule frontière PostgreSQL.
- Les pages `app/**/page.tsx` composent les vues ; la logique métier et les accès API vivent dans `features/` et `lib/`.
- Le frontend utilise exclusivement Tailwind CSS v4 dans `apps/web/app/globals.css`; aucun CSS local, style inline ou CSS-in-JS.
- Les mutations vérifient la session, l'origine/CSRF, l'autorisation par ressource, la validation Zod et le rate limiting adapté.
- Les réponses et messages d'erreur visibles restent sobres, localisés en français et sans stack trace, secret, token ou donnée privée.
- Les tests sont écrits avant le code de production, exécutés en échec Red puis en succès Green, et aucun test fusionné n'est affaibli ou supprimé.
- Aucune nouvelle règle d'XP, messagerie, calendrier externe, administration globale ou table autre que `invitations` n'est livrée dans F08.

---

## Cartographie des fichiers

### Contrats et persistance

- Create: `packages/shared/src/invitations.ts` — statuts, commandes et projection d'invitation.
- Create: `packages/shared/src/dashboard.ts` — projections des blocs dashboard et gestion MJ.
- Modify: `packages/shared/src/index.ts` — exports publics des contrats F08.
- Create: `packages/database/src/schema/invitations.ts` — table, clés étrangères et index invitations.
- Modify: `packages/database/src/index.ts` — export du schéma invitations.
- Create: `packages/database/migrations/0008_invitations.sql` — migration additive générée et contrôlée.

### Backend

- Create: `apps/api/src/modules/invitations/policy.ts` — transitions, expiration et permissions invitations.
- Create: `apps/api/src/modules/invitations/repository.ts` — persistance et transaction d'acceptation.
- Create: `apps/api/src/modules/invitations/services/create-invitation.ts` — cas d'usage d'envoi.
- Create: `apps/api/src/modules/invitations/services/list-invitations.ts` — cas d'usage des listes reçues/émises.
- Create: `apps/api/src/modules/invitations/services/decide-invitation.ts` — acceptation/refus/annulation autorisés.
- Create: `apps/api/src/modules/invitations/handlers.ts` — transport HTTP et erreurs.
- Create: `apps/api/src/modules/invitations/routes.ts` — association routes/handlers.
- Create: `apps/api/src/modules/members/policy.ts` — règles de retrait du roster.
- Create: `apps/api/src/modules/members/repository.ts` — lecture et retrait transactionnel des membres.
- Create: `apps/api/src/modules/members/services/list-members.ts` — projection roster.
- Create: `apps/api/src/modules/members/services/remove-member.ts` — retrait d'un joueur par le MJ.
- Create: `apps/api/src/modules/members/handlers.ts` — transport roster.
- Create: `apps/api/src/modules/members/routes.ts` — routes roster.
- Create: `apps/api/src/modules/dashboard/repository.ts` — sources de projection dashboard et gestion MJ.
- Create: `apps/api/src/modules/dashboard/services/get-dashboard.ts` — agrégation partielle par bloc.
- Create: `apps/api/src/modules/dashboard/services/get-game-management.ts` — projection protégée de gestion.
- Create: `apps/api/src/modules/dashboard/handlers.ts` — endpoints dashboard et gestion.
- Create: `apps/api/src/modules/dashboard/routes.ts` — routes dashboard.
- Modify: `apps/api/src/app.ts` — injection et enregistrement des modules F08.
- Modify: `apps/api/src/index.ts` — repositories PostgreSQL et dépendances de production.

### Frontend

- Create: `apps/web/lib/dashboard-api.ts` — client des projections dashboard/gestion.
- Create: `apps/web/lib/invitations-api.ts` — client invitations.
- Create: `apps/web/lib/members-api.ts` — client roster.
- Create: `apps/web/features/dashboard/dashboard-view.tsx` — composition responsive du dashboard.
- Create: `apps/web/features/dashboard/dashboard-block.tsx` — états ready/empty/error/retry.
- Create: `apps/web/features/gm-management/gm-management-view.tsx` — shell de gestion MJ et onglets.
- Create: `apps/web/features/gm-management/roster-panel.tsx` — roster et retrait accessible.
- Create: `apps/web/features/gm-management/invitations-panel.tsx` — invitation et décisions.
- Create: `apps/web/features/gm-management/manage-tabs.tsx` — navigation d'onglets desktop/mobile.
- Modify: `apps/web/app/page.tsx` — composition du dashboard authentifié.
- Create: `apps/web/app/gestion/parties/[id]/page.tsx` — route de gestion MJ.
- Modify: `apps/web/app/gestion/parties/[id]/candidatures/page.tsx` — intégration dans le shell de gestion.
- Modify: `apps/web/features/layout/app-shell.tsx` — liens dashboard et gestion sans duplication de shell.

### Tests et documentation

- Create: `packages/shared/tests/invitations.test.ts` et `packages/shared/tests/dashboard.test.ts`.
- Create: `packages/database/tests/invitations-schema.test.ts`.
- Create: `apps/api/tests/helpers/in-memory-invitations-repository.ts` et `apps/api/tests/helpers/in-memory-members-repository.ts`.
- Create: `apps/api/tests/helpers/in-memory-dashboard-repository.ts`.
- Create: `apps/api/tests/unit/invitations/policy.test.ts` et `apps/api/tests/unit/invitations/services.test.ts`.
- Create: `apps/api/tests/unit/members/services.test.ts`.
- Create: `apps/api/tests/unit/dashboard/services.test.ts`.
- Create: `apps/api/tests/api/invitations/routes.test.ts`, `members/routes.test.ts` et `dashboard/routes.test.ts`.
- Create: `apps/api/tests/integration/postgres-dashboard-gm-management.test.ts`.
- Create: `apps/web/tests/dashboard-visual.test.ts`, `gm-management-visual.test.ts`, `invitations-api.test.ts` et `members-api.test.ts`.
- Create: `docs/features/014-dashboard-and-gm-management.md`.
- Modify: `docs/project-status.md`, `docs/security/authorization-matrix.md` et le plan de migration si requis.

---

## Task 1: Define shared invitation and dashboard contracts

**Files:**
- Create: `packages/shared/src/invitations.ts`
- Create: `packages/shared/src/dashboard.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/invitations.test.ts`, `packages/shared/tests/dashboard.test.ts`

**Interfaces:**
- Produces `invitationStatusSchema`, `invitationCommandSchema`, `invitationDecisionSchema`, `Invitation` and `InvitationsPage`.
- Produces `dashboardBlockStateSchema`, `DashboardBlock<T>`, `DashboardView`, `GameManagementView`, `DashboardGame`, `DashboardSession` and their TypeScript projections.
- Defines `DashboardBlock<T> = { status: 'READY' | 'EMPTY' | 'ERROR'; data: T | null; error: { code: string; message: string } | null }`.
- Defines `ApplicationSummary`, `InvitationSummary`, `SchedulingAction`, `AttendanceAction` and `GameMemberView` with only the identifiers, labels, dates, roles and counts rendered by F08.

- [ ] **Step 1: Write failing contract tests.**

  Test that an invitation command accepts only a UUID `inviteeId`, rejects unknown properties, and that a decision accepts only `ACCEPTED`, `REJECTED` or `CANCELLED`. Test that dashboard blocks represent `READY`, `EMPTY` and `ERROR` without allowing arbitrary status strings.

  ```ts
  it('rejects invitation fields controlled by the server', () => {
    expect(invitationCommandSchema.safeParse({ inviteeId: validUuid, expiresAt: new Date().toISOString() }).success).toBe(false)
  })

  it('accepts only explicit dashboard block states', () => {
    expect(dashboardBlockStateSchema.safeParse('READY').success).toBe(true)
    expect(dashboardBlockStateSchema.safeParse('LOADING').success).toBe(false)
  })
  ```

- [ ] **Step 2: Run the contract tests and verify Red.**

  Run: `pnpm exec vitest run packages/shared/tests/invitations.test.ts packages/shared/tests/dashboard.test.ts`

  Expected: FAIL because the F08 contract modules and schemas do not exist.

- [ ] **Step 3: Implement the minimum shared contracts.**

  Define statuses `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `EXPIRED`; use strict Zod objects; keep expiration server-controlled; export explicit date strings for API views and `Date` values only inside repositories. Model invitation list entries with game title, inviter/invitee display names, status, expiry and timestamps.

- [ ] **Step 4: Run the contract tests and verify Green.**

  Run the same Vitest command. Expected: all new contract assertions pass with no warnings.

- [ ] **Step 5: Refactor exports without changing behavior.**

  Export the new modules from `packages/shared/src/index.ts`, remove duplicate inline types from tests, and rerun the two contract suites.

- [ ] **Step 6: Commit the contract layer.**

  ```bash
  git add packages/shared/src packages/shared/tests
  git commit -m "feat: define dashboard and invitation contracts"
  ```

## Task 2: Add invitation persistence and migration

**Files:**
- Create: `packages/database/src/schema/invitations.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0008_invitations.sql`
- Modify: `packages/database/migrations/meta/*` generated snapshot and journal
- Test: `packages/database/tests/invitations-schema.test.ts`

**Interfaces:**
- Produces `invitations` and `invitationsSchema` with foreign keys to `games` and `users`.
- Produces a partial unique constraint for one `PENDING` invitation per `(gameId, inviteeId)` and indexes for invitee, game and expiry queries.

- [ ] **Step 1: Write failing schema tests.**

  Assert the table name, columns, UUID foreign keys, status/expiry columns, the pending uniqueness definition and the expiry index. Keep assertions at the schema metadata level, as in the existing database schema tests.

- [ ] **Step 2: Run the schema tests and verify Red.**

  Run: `pnpm exec vitest run packages/database/tests/invitations-schema.test.ts`

  Expected: FAIL because `invitationsSchema` is missing.

- [ ] **Step 3: Implement the additive Drizzle schema.**

  Add `gameId`, `inviterId`, `inviteeId`, `status`, `expiresAt`, `createdAt` and `updatedAt`. Use `onDelete: 'cascade'` for the game and user relationships. Define a partial unique index restricted to `status = 'PENDING'` so terminal invitations can be followed by a later invitation.

- [ ] **Step 4: Generate and inspect the migration.**

  Run: `pnpm --filter @jdr-hub/database db:generate`

  Expected: one additive migration creating `invitations`, its foreign keys and indexes; no existing table is dropped or altered destructively. If the generator cannot express the partial index, add only the explicit `CREATE UNIQUE INDEX ... WHERE status = 'PENDING'` statement to the generated migration and document the reason in the migration comment.

- [ ] **Step 5: Run schema tests and typecheck.**

  Run: `pnpm exec vitest run packages/database/tests/invitations-schema.test.ts && pnpm --filter @jdr-hub/database typecheck`

  Expected: PASS with the schema and migration metadata consistent.

- [ ] **Step 6: Commit persistence.**

  ```bash
  git add packages/database/src packages/database/migrations packages/database/tests
  git commit -m "feat: persist game invitations"
  ```

## Task 3: Implement invitation policy, repository and services

**Files:**
- Create: `apps/api/src/modules/invitations/policy.ts`
- Create: `apps/api/src/modules/invitations/repository.ts`
- Create: `apps/api/src/modules/invitations/services/create-invitation.ts`
- Create: `apps/api/src/modules/invitations/services/list-invitations.ts`
- Create: `apps/api/src/modules/invitations/services/decide-invitation.ts`
- Create: `apps/api/tests/helpers/in-memory-invitations-repository.ts`
- Test: `apps/api/tests/unit/invitations/policy.test.ts`, `apps/api/tests/unit/invitations/services.test.ts`

**Interfaces:**
- `InvitationRepository.create(input): Promise<Invitation>`
- `InvitationRepository.listForInvitee(input): Promise<Invitation[]>`
- `InvitationRepository.listForOwner(input): Promise<Invitation[] | null>`
- `InvitationRepository.updateStatus(input): Promise<Invitation | null>`
- `createInvitation({ gameId, ownerId, inviteeId, repository, now })`
- `listInvitations({ scope, userId, gameId, repository, now })`
- `decideInvitation({ invitationId, userId, status, repository, now })`

- [ ] **Step 1: Write failing policy and service tests.**

  Cover: owner can invite only to `OPEN`/`ACTIVE`; invitee cannot be an active member; a pending duplicate is rejected; server expiry is seven days; invitee can accept/reject only its own unexpired pending invitation; owner can cancel only its own pending invitation; accepting a full game returns a conflict; accepting twice is idempotent only when the requested terminal status already matches.

  ```ts
  it('accepts an invitation atomically only while capacity remains', async () => {
    const repository = createInMemoryInvitationsRepository({ capacity: 4, activeMembers: 3 })
    const result = await decideInvitation({ invitationId, userId: inviteeId, status: 'ACCEPTED', repository, now: () => now })
    expect(result.status).toBe('ACCEPTED')
    expect(await repository.countActiveMembers(gameId)).toBe(4)
  })
  ```

- [ ] **Step 2: Run invitation unit tests and verify Red.**

  Run: `pnpm exec vitest run apps/api/tests/unit/invitations`

  Expected: FAIL because the policy, repository factory and services are absent.

- [ ] **Step 3: Implement policy and in-memory behavior.**

  Centralize the seven-day expiration, allowed game statuses and terminal transitions. Make the helper deterministic and expose only test utilities; do not export it from production modules.

- [ ] **Step 4: Implement the PostgreSQL repository.**

  Use explicit projections joining games and users. In `decide`, lock the invitation and game row in one transaction, verify ownership, expiry, status and active capacity, insert a `PLAYER` member on acceptance, then update the invitation. Convert unique/foreign-key conflicts to `INVITATION_CONFLICT` without returning SQL details.

- [ ] **Step 5: Run invitation unit tests and verify Green.**

  Run the same Vitest command. Expected: all policy and service cases pass, including duplicate requests and capacity conflicts.

- [ ] **Step 6: Refactor repository projections.**

  Extract explicit row-to-view conversion and shared terminal-status checks; rerun the unit suites and confirm no production service imports Hono.

- [ ] **Step 7: Commit invitation domain logic.**

  ```bash
  git add apps/api/src/modules/invitations apps/api/tests/helpers apps/api/tests/unit/invitations
  git commit -m "feat: implement invitation workflow"
  ```

## Task 4: Expose secure invitation API routes

**Files:**
- Create: `apps/api/src/modules/invitations/handlers.ts`
- Create: `apps/api/src/modules/invitations/routes.ts`
- Test: `apps/api/tests/api/invitations/routes.test.ts`

**Interfaces:**
- `POST /games/:gameId/invitations` creates an invitation with `{ inviteeId }`.
- `GET /games/:gameId/invitations` lists owner-issued invitations.
- `GET /invitations` lists invitations received by the current user.
- `PATCH /invitations/:invitationId` accepts/rejects for the invitee or cancels for the owner.

- [ ] **Step 1: Write failing API security tests.**

  Test unauthenticated `401`, missing/untrusted Origin on mutations `403`, malformed UUID/unknown JSON properties `400`, another owner's list `403`/`404`, invitee-only acceptance, owner-only cancellation, stable `requestId` envelope and French generic error for repository failure.

- [ ] **Step 2: Run API tests and verify Red.**

  Run: `pnpm exec vitest run apps/api/tests/api/invitations/routes.test.ts`

  Expected: FAIL because invitation handlers and routes are not registered.

- [ ] **Step 3: Implement handlers and routes.**

  Follow the existing auth handler pattern: read the access cookie, authenticate the user, validate path/body with Zod, verify trusted origin and rate limit writes. Map domain errors to `400/401/403/404/409/429/500` and never expose the underlying error string.

- [ ] **Step 4: Register the module in the test app.**

  Add optional invitation dependencies to `createApiApp`, register `registerInvitationRoutes`, and inject a memory repository in the route tests.

- [ ] **Step 5: Run API tests and verify Green.**

  Run the same Vitest command. Expected: all authentication, authorization, validation, conflict and response-envelope cases pass.

- [ ] **Step 6: Commit the API surface.**

  ```bash
  git add apps/api/src/modules/invitations apps/api/src/app.ts apps/api/tests/api/invitations
  git commit -m "feat: expose invitation api"
  ```

## Task 5: Add protected roster read and removal

**Files:**
- Create: `apps/api/src/modules/members/policy.ts`
- Create: `apps/api/src/modules/members/repository.ts`
- Create: `apps/api/src/modules/members/services/list-members.ts`
- Create: `apps/api/src/modules/members/services/remove-member.ts`
- Create: `apps/api/src/modules/members/handlers.ts`
- Create: `apps/api/src/modules/members/routes.ts`
- Create: `apps/api/tests/helpers/in-memory-members-repository.ts`
- Test: `apps/api/tests/unit/members/services.test.ts`, `apps/api/tests/api/members/routes.test.ts`

**Interfaces:**
- `GET /games/:gameId/members` returns active roster projections to the owner.
- `DELETE /games/:gameId/members/:userId` marks an active `PLAYER` as `REMOVED` for the owner.
- `MemberRepository.listForOwner(gameId, ownerId): Promise<GameMemberView[] | null>`
- `MemberRepository.remove({ gameId, ownerId, userId, now }): Promise<boolean>`

- [ ] **Step 1: Write failing member tests.**

  Cover owner projection, non-owner refusal, missing member, refusal to remove the game owner, removal idempotence, active-member access loss and no data leakage between games.

- [ ] **Step 2: Run member tests and verify Red.**

  Run: `pnpm exec vitest run apps/api/tests/unit/members apps/api/tests/api/members`

  Expected: FAIL because the members module is absent.

- [ ] **Step 3: Implement repository and services.**

  Query only explicit user/member fields. In removal, lock the game/member rows, require the caller to own the game, and update only an active player to `REMOVED`; never delete the GM row or accept a client-provided role/status.

- [ ] **Step 4: Implement secure handlers and register routes.**

  Reuse the API auth/origin/error conventions and rate limit the mutation. Register the module in `app.ts` and inject its PostgreSQL repository from `index.ts`.

- [ ] **Step 5: Run member tests and verify Green.**

  Run the same Vitest command. Expected: all unit and API authorization cases pass.

- [ ] **Step 6: Commit roster management.**

  ```bash
  git add apps/api/src/modules/members apps/api/src/app.ts apps/api/src/index.ts apps/api/tests/helpers apps/api/tests/unit/members apps/api/tests/api/members
  git commit -m "feat: add protected game roster management"
  ```

## Task 6: Build dashboard and game-management projections

**Files:**
- Create: `apps/api/src/modules/dashboard/repository.ts`
- Create: `apps/api/src/modules/dashboard/services/get-dashboard.ts`
- Create: `apps/api/src/modules/dashboard/services/get-game-management.ts`
- Create: `apps/api/tests/helpers/in-memory-dashboard-repository.ts`
- Test: `apps/api/tests/unit/dashboard/services.test.ts`

**Interfaces:**
- `DashboardRepository.getNextSession(userId, now): Promise<DashboardSession | null>`
- `DashboardRepository.listActiveGames(userId): Promise<DashboardGame[]>`
- `DashboardRepository.listApplicationSummary(userId): Promise<ApplicationSummary>`
- `DashboardRepository.listInvitationSummary(userId, now): Promise<InvitationSummary>`
- `DashboardRepository.listSchedulingActions(userId, now): Promise<SchedulingAction[]>`
- `DashboardRepository.listAttendanceActions(userId, now): Promise<AttendanceAction[]>`
- `DashboardRepository.getGameManagement(gameId, ownerId, now): Promise<GameManagementView | null>`
- `getDashboard({ userId, repository, now }): Promise<DashboardView>`
- `getGameManagement({ userId, gameId, repository, now }): Promise<GameManagementView>`

- [ ] **Step 1: Write failing aggregation tests.**

  Test player and MJ projections, empty data, owner-only management projection, explicit block states, and one failed secondary source while the other blocks remain ready. Test that private member data is absent from dashboard output.

  ```ts
  it('keeps the next session when invitations source fails', async () => {
    const repository = createInMemoryDashboardRepository({ fail: ['invitations'] })
    const dashboard = await getDashboard({ userId, repository, now: () => now })
    expect(dashboard.nextSession.status).toBe('READY')
    expect(dashboard.invitations.status).toBe('ERROR')
  })
  ```

- [ ] **Step 2: Run dashboard unit tests and verify Red.**

  Run: `pnpm exec vitest run apps/api/tests/unit/dashboard/services.test.ts`

  Expected: FAIL because dashboard repository and services do not exist.

- [ ] **Step 3: Implement source projections.**

  Query PostgreSQL with explicit selects and resource filters: active memberships or owner relation for games/sessions, owner relation for GM data, pending invitations with server-side expiry interpretation, and only aggregate counts needed by the dashboard. Do not expose exact availability, Discord tokens or raw database rows.

- [ ] **Step 4: Implement `getDashboard` with independent source results.**

  Use `Promise.allSettled` over the source methods. Map fulfilled empty results to `EMPTY`, fulfilled values to `READY`, and rejected values to `ERROR` with a stable internal code and a French-safe public message. The service returns no Hono types and accepts an injectable clock.

- [ ] **Step 5: Implement protected management projection.**

  Return `null` for a missing/non-owned game so the handler can apply the established not-found/forbidden policy. Include game summary, active roster, candidatures, pending invitations, next session and proposal counts without moving mutation logic into the aggregate.

- [ ] **Step 6: Run dashboard unit tests and verify Green.**

  Run the same Vitest command. Expected: all role, empty, partial-error and projection-minimization assertions pass.

- [ ] **Step 7: Refactor query helpers and commit.**

  Extract only repeated projection conversion/query predicates, rerun tests, then commit:

  ```bash
  git add apps/api/src/modules/dashboard apps/api/tests/helpers apps/api/tests/unit/dashboard
  git commit -m "feat: aggregate dashboard and gm projections"
  ```

## Task 7: Expose dashboard and management API

**Files:**
- Create: `apps/api/src/modules/dashboard/handlers.ts`
- Create: `apps/api/src/modules/dashboard/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/tests/api/dashboard/routes.test.ts`

**Interfaces:**
- `GET /dashboard` authenticates from the session and returns `DashboardView`.
- `GET /games/:gameId/manage` authenticates from the session and returns `GameManagementView` only for the owner.

- [ ] **Step 1: Write failing dashboard API tests.**

  Cover no session `401`, valid player response, valid MJ response, non-owner `403`/`404` policy, stable `requestId`, partial source errors, rate-limit behavior and absence of user-selected IDs in the dashboard query.

- [ ] **Step 2: Run dashboard API tests and verify Red.**

  Run: `pnpm exec vitest run apps/api/tests/api/dashboard/routes.test.ts`

  Expected: FAIL because dashboard routes are not registered.

- [ ] **Step 3: Implement handlers.**

  Follow the auth cookie and `authenticateUser` pattern. Map only known domain errors; unexpected repository errors return the generic French `500` envelope. Keep response serialization in handlers and keep authorization in the service/repository boundary.

- [ ] **Step 4: Register dependencies in the API composition root.**

  Add `DashboardDependencies` to `createApiApp`, construct the PostgreSQL repository in `startApi`, and register the routes after the existing authenticated modules. Do not read `process.env` from handlers or services.

- [ ] **Step 5: Run dashboard API tests and verify Green.**

  Run the same Vitest command. Expected: all API authentication, authorization, partial-error and response-shape tests pass.

- [ ] **Step 6: Commit API dashboard endpoints.**

  ```bash
  git add apps/api/src/modules/dashboard apps/api/src/app.ts apps/api/src/index.ts apps/api/tests/api/dashboard
  git commit -m "feat: expose dashboard api"
  ```

## Task 8: Add dashboard frontend and replace the shell entry point

**Files:**
- Create: `apps/web/lib/dashboard-api.ts`
- Create: `apps/web/features/dashboard/dashboard-block.tsx`
- Create: `apps/web/features/dashboard/dashboard-view.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/features/layout/app-shell.tsx`
- Test: `apps/web/tests/dashboard-api.test.ts`, `apps/web/tests/dashboard-visual.test.ts`

**Interfaces:**
- `createDashboardApi(options).getDashboard(): Promise<DashboardView | null>`
- `DashboardView` renders source blocks without recomputing business counters.

- [ ] **Step 1: Write failing frontend client and component tests.**

  Test French error translation for non-OK responses, API envelope parsing, ready/empty/error/retry states, accessible headings, notification bell presence, responsive layout classes and no raw exception text.

- [ ] **Step 2: Run frontend tests and verify Red.**

  Run: `pnpm exec vitest run apps/web/tests/dashboard-api.test.ts apps/web/tests/dashboard-visual.test.ts`

  Expected: FAIL because the dashboard client and components do not exist.

- [ ] **Step 3: Implement the dashboard API client.**

  Use `credentials: 'include'`, `cache: 'no-store'`, the existing API base URL convention and a French-safe `DASHBOARD_ERROR`. Never return raw response text or exception messages to the UI.

- [ ] **Step 4: Implement the desktop dashboard.**

  Match `docs/maquettes/desktop/tableau_de_bord_jdr_hub/screen.png`: next-session hero, progression/summary card, active games list and activity/action column. Use official logo through `AppShell`, existing tokens, Lucide icons and explicit links to manage owned games.

- [ ] **Step 5: Implement the mobile dashboard.**

  Match `docs/maquettes/mobile/tableau_de_bord_mobile/screen.png`: fixed shared header, next session first, stacked active-game cards, priority actions and bottom navigation. Keep all actions touch-sized and keyboard/focus accessible.

- [ ] **Step 6: Wire the root route.**

  Keep `apps/web/app/page.tsx` as route composition only and render the dashboard view. A `401` uses the existing French connection view/empty state; authenticated data never falls back to fake user content.

- [ ] **Step 7: Run frontend tests and verify Green.**

  Run the same Vitest command and `pnpm --filter @jdr-hub/web typecheck`. Expected: all client/visual assertions and web types pass.

- [ ] **Step 8: Refactor shared shell usage and commit.**

  Ensure `AppShell` remains the only header/navigation implementation, remove duplicated dashboard shell markup, rerun tests, then commit:

  ```bash
  git add apps/web/app/page.tsx apps/web/features/dashboard apps/web/features/layout apps/web/lib/dashboard-api.ts apps/web/tests/dashboard*
  git commit -m "feat: add authenticated dashboard view"
  ```

## Task 9: Build the responsive MJ management experience

**Files:**
- Create: `apps/web/lib/invitations-api.ts`
- Create: `apps/web/lib/members-api.ts`
- Create: `apps/web/features/gm-management/manage-tabs.tsx`
- Create: `apps/web/features/gm-management/gm-management-view.tsx`
- Create: `apps/web/features/gm-management/roster-panel.tsx`
- Create: `apps/web/features/gm-management/invitations-panel.tsx`
- Create: `apps/web/app/gestion/parties/[id]/page.tsx`
- Modify: `apps/web/app/gestion/parties/[id]/candidatures/page.tsx`
- Modify: `apps/web/features/applications/applications-list-view.tsx`
- Test: `apps/web/tests/gm-management-visual.test.ts`, invitation/member client tests

**Interfaces:**
- `createInvitationsApi(options).listForGame(gameId)`, `.listMine()`, `.create(gameId, inviteeId)`, `.decide(id, status)`.
- `createMembersApi(options).listForGame(gameId)`, `.remove(gameId, userId)`.
- `GmManagementView` consumes `GameManagementView` and delegates mutations to domain clients.

- [ ] **Step 1: Write failing frontend tests.**

  Test invitation list/create/decision client envelopes, roster removal client, tab semantics, ownership-safe links, pending/empty/error states, confirmation dialog, success live region, focus-visible controls and responsive class boundaries.

- [ ] **Step 2: Run frontend management tests and verify Red.**

  Run: `pnpm exec vitest run apps/web/tests/gm-management-visual.test.ts apps/web/tests/invitations-api.test.ts apps/web/tests/members-api.test.ts`

  Expected: FAIL because the F08 clients and management components do not exist.

- [ ] **Step 3: Implement the invitation and members clients.**

  Follow existing frontend client conventions: encode path IDs, send trusted Origin for mutations, translate all failures into French-safe messages and preserve no raw API exception text.

- [ ] **Step 4: Implement shared tab navigation.**

  Use `role="tablist"`, `role="tab"`, `aria-selected`, keyboard focus and a mobile overflow strategy. The Parameters tab may link to an existing settings route but cannot introduce a new mutation.

- [ ] **Step 5: Implement desktop management view.**

  Match `gestion_mj_la_crypte_maudite` and `gestion_des_candidatures_jdr_hub`: game title/status, group summary, next session, tabs, application decisions, invitation controls and roster cards. Reuse existing application and scheduling clients; do not reimplement capacity or session status rules in React.

- [ ] **Step 6: Implement mobile management view.**

  Match `gestion_des_candidatures_mobile`: compact game summary, scrollable tabs, vertical cards, full-width touch actions and accessible confirmation for member removal/cancellation.

- [ ] **Step 7: Wire management routes.**

  Keep the new `app/gestion/parties/[id]/page.tsx` as composition only. Pass the dynamic ID to a feature component, show localized loading/error/empty states, and ensure the existing candidatures page uses the same `AppShell` and management navigation.

- [ ] **Step 8: Run management tests and verify Green.**

  Run the same Vitest command and `pnpm --filter @jdr-hub/web typecheck`. Expected: all client, accessibility and visual contract tests pass.

- [ ] **Step 9: Refactor duplicated application card behavior and commit.**

  Keep the existing application domain behavior, extract only presentational composition needed by the management shell, rerun the web tests, then commit:

  ```bash
  git add apps/web/app/gestion apps/web/features/gm-management apps/web/features/applications apps/web/lib apps/web/tests
  git commit -m "feat: add responsive gm management workspace"
  ```

## Task 10: Verify real PostgreSQL transactions and authorization

**Files:**
- Create: `apps/api/tests/integration/postgres-dashboard-gm-management.test.ts`
- Modify: `vitest.integration.config.ts` — include the F07 and F08 PostgreSQL integration files.
- Test: existing migration and API suites remain unchanged

**Interfaces:**
- The integration suite creates isolated fictitious users, games, memberships, applications, sessions, proposals and invitations.
- It verifies the same repository interfaces used by production composition.

- [ ] **Step 1: Write failing PostgreSQL integration tests.**

  Cover migration application, invitation creation and pending uniqueness, acceptance transaction adding a member, capacity race protection, expiration, cancellation authorization, roster removal, dashboard projection isolation, management non-owner refusal and partial source error behavior at the service boundary.

- [ ] **Step 2: Run the integration suite and verify Red.**

  Run: `DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test pnpm test:integration`

  Expected: FAIL until the F08 migration, repositories and integration setup exist. Use only an explicitly isolated test database with fictitious values.

- [ ] **Step 3: Implement the isolated fixtures and repository assertions.**

  Seed with reserved UUIDs and test-only Discord IDs, clean only the rows created by the suite, and assert database state after successful and failed transactions. Do not read any local `.env` file.

- [ ] **Step 4: Run the integration suite and verify Green.**

  Run the same command. Expected: all PostgreSQL assertions pass with no data left outside the isolated test database.

- [ ] **Step 5: Commit integration coverage.**

  ```bash
  git add apps/api/tests/integration vitest.integration.config.ts
  git commit -m "test: verify dashboard and gm management on postgres"
  ```

## Task 11: Complete documentation, security matrix and delivery checks

**Files:**
- Create: `docs/features/014-dashboard-and-gm-management.md`
- Modify: `docs/project-status.md`
- Modify: `docs/security/authorization-matrix.md`
- Verify: `.github/workflows/ci.yml` already executes `pnpm test:integration` and requires no change.

- [ ] **Step 1: Write the feature traceability file.**

  Record only delivered behavior, branch `feat/dashboard-and-gm-management`, migration `0008`, exact tests/results, TDD Red/Green/Refactor evidence, security controls, manual checks, known limitations and PR status. Keep it `IN_PROGRESS` until the PR is actually opened.

- [ ] **Step 2: Update the authorization matrix.**

  Add visitor, authenticated user, candidate/member and MJ owner rows for dashboard read, invitation create/list/decision/cancel, roster read/remove and management projection. Record that frontend tabs do not grant authorization.

- [ ] **Step 3: Update project status and migration notes.**

  Add F08 to the global table with branch, tests, migration and current PR status. Do not mark it `IN_REVIEW` before a GitHub PR exists and do not mark it `MERGED` before owner confirmation.

- [ ] **Step 4: Run repository-wide checks.**

  ```bash
  pnpm test -- --reporter=dot
  pnpm test:integration
  pnpm lint
  pnpm typecheck
  pnpm build
  git diff --check
  ```

  Expected: every command exits `0`; record exact file/test counts in the feature fiche.

- [ ] **Step 5: Perform manual UI and security checks.**

  Verify dashboard desktop/tablet/mobile, management desktop/mobile, empty/loading/error/partial-error states, keyboard navigation, focus restoration, invitation decision feedback, non-owner API refusal, noindex metadata and absence of sensitive fields. Check that no raw API error is rendered.

- [ ] **Step 6: Scan the final diff for secrets and unrelated files.**

  Review `git status --short`, `git diff develop...HEAD`, tracked files and the final secret-scan output while excluding only the authorized `.env.example` path. Remove build artifacts, logs, temporary files and unapproved changes.

- [ ] **Step 7: Commit documentation and checks.**

  ```bash
  git add docs/features/014-dashboard-and-gm-management.md docs/project-status.md docs/security/authorization-matrix.md .github/workflows/ci.yml
  git commit -m "docs: track dashboard and gm management"
  ```

- [ ] **Step 8: Run verification before delivery.**

  Re-run the full verification commands after the final commit, inspect the clean status and diff, then request a code review. Push the dedicated branch and open a PR targeting `develop`; stop after providing the PR link for human review and merge.
