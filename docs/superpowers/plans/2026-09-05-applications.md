# F04 — Candidatures et roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de candidater à une partie, de suivre le statut et au MJ propriétaire d'accepter/refuser une candidature avec ajout transactionnel au roster.

**Architecture:** Le module `applications` sépare routes, handlers, repository et services par cas d'usage. Les services reçoivent l'utilisateur authentifié et des dépendances injectées ; seuls les repositories utilisent Drizzle. L'acceptation verrouille la partie dans une transaction et crée le membre joueur de façon atomique.

**Tech Stack:** Hono, TypeScript strict, Zod, Drizzle/PostgreSQL, Next.js App Router, React Server/Client Components, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-05-applications-design.md`

## Global Constraints

- Ne pas modifier les contrats, comportements ou schémas existants hors ajout F04.
- Les routes sensibles appliquent authentification, vérification d'origine et autorisation côté API.
- Les entrées de commande sont des objets Zod stricts avec limites explicites.
- Les tests validés et fusionnés restent immuables ; aucun `skip`, `todo` ou `only`.
- Le frontend utilise exclusivement Tailwind et respecte D05, D06 et M04.
- Aucun secret, fichier `.env`, token ou donnée personnelle réelle dans le diff.
- Utiliser pnpm ; les dépendances existantes suffisent et aucune dépendance ne doit être ajoutée.

### Task 1: Shared contracts and database schema

**Files:**
- Create: `packages/shared/src/applications.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/database/src/schema/games.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0003_applications-and-members.sql`
- Test: `packages/shared/tests/applications.test.ts`
- Test: `packages/database/tests/applications-schema.test.ts`

**Interfaces:**
- Produces `applicationStatusSchema`, `applicationDecisionSchema`, `applicationCommandSchema`, `Application`, `GameMember`, and their inferred types.
- Produces Drizzle tables `applications` and `gameMembers` through `gameSchema`.

- [ ] **Step 1: Write failing contract and schema tests.** Assert strict message validation (optional, max 1,000), decisions limited to `ACCEPTED`/`REJECTED`, table names, unique `(gameId,userId)`, primary key and foreign keys.
- [ ] **Step 2: Run `pnpm exec vitest run packages/shared/tests/applications.test.ts packages/database/tests/applications-schema.test.ts` and confirm failure because contracts/tables do not exist.**
- [ ] **Step 3: Add the Zod contracts and Drizzle table definitions.** Keep roles/statuses as explicit enums represented by existing varchar conventions; do not expose database rows to the browser.
- [ ] **Step 4: Add the non-destructive SQL migration and export the schema.** The migration creates `applications` and `game_members`, foreign keys with cascade on parent deletion, the unique application constraint and indexes for game/user/status lookups.
- [ ] **Step 5: Run the targeted tests and shared/database typechecks.**
- [ ] **Step 6: Commit `test: define application contracts` then `feat: add application persistence`.**

### Task 2: Repository and application services

**Files:**
- Create: `apps/api/src/modules/applications/repository.ts`
- Create: `apps/api/src/modules/applications/services/submit-application.ts`
- Create: `apps/api/src/modules/applications/services/list-my-applications.ts`
- Create: `apps/api/src/modules/applications/services/list-game-applications.ts`
- Create: `apps/api/src/modules/applications/services/decide-application.ts`
- Modify: `apps/api/src/modules/games/repository.ts` only when a typed game lookup/transaction boundary is required
- Create: `apps/api/tests/helpers/in-memory-applications-repository.ts`
- Test: `apps/api/tests/unit/applications/services.test.ts`
- Test: `apps/api/tests/integration/applications/repository.test.ts`

**Interfaces:**
- `ApplicationRepository` exposes `create`, `findById`, `findForUser`, `findForGameOwner`, and `decide` without Hono types.
- `submitApplication({ userId, gameId, message, repository })` returns an application or a typed domain conflict.
- `decideApplication({ applicationId, ownerId, status, repository })` returns the updated application or a typed authorization/conflict result.

- [ ] **Step 1: Write failing unit tests for unauthenticated-independent domain input, own-game rejection, private/closed game rejection, duplicate rejection, and allowed pending creation.**
- [ ] **Step 2: Run the service tests and verify they fail for missing services/repository.**
- [ ] **Step 3: Write failing integration tests for unique constraint, owner-only listing, atomic acceptance, capacity limit and repeated decision.** Use the existing PostgreSQL integration setup and fake values only.
- [ ] **Step 4: Run the integration tests and verify the failures are caused by missing tables/repository methods.**
- [ ] **Step 5: Implement the repository with explicit projections.** Candidate views return only application id, game summary, candidate username where authorized, message, status and timestamps; no Discord id or session data.
- [ ] **Step 6: Implement services with domain results.** `decide` must run one transaction that locks the game row, counts active `PLAYER` members, rejects a full game, updates the pending application and inserts the member.
- [ ] **Step 7: Run unit and integration tests, then typecheck the API.**
- [ ] **Step 8: Commit `feat: implement application services and repository`.**

### Task 3: Hono transport, authentication and API behavior

**Files:**
- Create: `apps/api/src/modules/applications/routes.ts`
- Create: `apps/api/src/modules/applications/handlers.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/tests/helpers/in-memory-applications-repository.ts`
- Test: `apps/api/tests/api/applications/routes.test.ts`

**Interfaces:**
- `ApplicationsDependencies` injects auth config/repository, application repository and clock.
- Routes: `POST /games/:id/applications`, `GET /applications`, `GET /games/:id/applications`, `PATCH /applications/:id`.

- [ ] **Step 1: Write failing API tests through public Hono routes.** Cover 401 without access cookie, 400 unknown/oversized fields, 403 non-owner management, 404 hidden game/application, 409 duplicate/full/repeated decisions, successful 201/200 responses and stable error envelopes.
- [ ] **Step 2: Add security tests for cross-user reads, self-application, private/closed games, forged `userId`/`ownerId`/`role` fields and missing/foreign `Origin` on mutations.**
- [ ] **Step 3: Run the API suite and confirm red failures.**
- [ ] **Step 4: Implement thin handlers.** Read route params/body/cookies/origin, call `authenticateUser`, validate Zod commands, call one service, map domain outcomes to existing generic error codes/statuses and never query Drizzle directly.
- [ ] **Step 5: Register application routes after auth middleware and before the not-found handler.** Keep existing game routes unchanged.
- [ ] **Step 6: Run targeted API tests plus all existing API tests and typecheck.**
- [ ] **Step 7: Commit `feat: expose application API`.**

### Task 4: Candidate and MJ frontend flows

**Files:**
- Create: `apps/web/lib/applications-api.ts`
- Create: `apps/web/features/applications/application-form.tsx`
- Create: `apps/web/features/applications/application-status.tsx`
- Create: `apps/web/features/applications/applications-list-view.tsx`
- Modify: `apps/web/features/games/game-detail-view.tsx`
- Create: `apps/web/app/candidatures/page.tsx`
- Test: `apps/web/tests/applications-api.test.ts`
- Test: `apps/web/tests/applications-pages.test.ts`
- Test: `apps/web/tests/applications-visual.test.ts`

**Interfaces:**
- The server API client accepts an explicit base URL/fetcher and never sends cookies implicitly from tests.
- Form posts only `{ message }`; it does not render or submit identity/role/status fields.
- The list view groups statuses into pending/accepted/rejected, matching D06/M04 tabs and accessible labels.

- [ ] **Step 1: Write failing client and source/component tests.** Assert endpoint paths, strict payload, detail CTA wording, status states, `/candidatures` route and Tailwind-only D06/M04 hierarchy (tabs, cards, accept/refuse actions, responsive stacking).
- [ ] **Step 2: Run targeted web tests and confirm red failures.**
- [ ] **Step 3: Implement the server client and form/status components.** Use accessible labels, pending/error/empty states and understandable French messages; keep the existing D05 detail composition and spacing tokens.
- [ ] **Step 4: Add the authenticated `/candidatures` page with server-side initial load and a client component only for tab/action interactions.**
- [ ] **Step 5: Run targeted web tests and web typecheck.**
- [ ] **Step 6: Commit `feat: add application user and MJ views`.**

### Task 5: Documentation, migration verification and final checks

**Files:**
- Modify: `docs/features/007-applications.md`
- Modify: `docs/project-status.md`
- Create: `docs/security/authorization-matrix.md` (the required matrix does not yet exist)
- Test: existing repository/API/unit/web suites

- [ ] **Step 1: Run migration generation/checks against the test database without changing existing migrations.**
- [ ] **Step 2: Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and the relevant database integration suite.**
- [ ] **Step 3: Inspect diff, tracked files, secrets, generated artifacts and `git status`; run `git diff --check`.**
- [ ] **Step 4: Create the authorization matrix and complete F04 documentation.** Record visitor/user/candidate/member/MJ permissions for the four application routes, then add Red/Green/Refactor evidence, security checks, commands/results, manual verification and known limits. Keep status `IN_PROGRESS` until a PR exists, then set `IN_REVIEW`.
- [ ] **Step 5: Commit `docs: record application workflow verification`, push `feat/applications`, and open a PR targeting `develop` without merging it.**

## Visual implementation notes from D05/D06/M04

- Preserve the shared JDR Hub header/navigation; do not copy Stitch markup or external demo avatars.
- D05: keep the “Rejoindre l’aventure” CTA in the right-side card; when authenticated, replace its action with the application form/status without changing the public synopsis and details hierarchy.
- D06 desktop: use a wide content column for candidate cards, a right campaign-status card, status tabs, accent rails, compact profile/message blocks and clear violet accept / outlined refuse actions.
- M04 mobile: use the campaign summary first, horizontally scrollable status chips, stacked cards, full-width paired actions and fixed bottom navigation spacing.
- Use Lucide icons and existing design tokens; no Material Symbols or arbitrary colors.
