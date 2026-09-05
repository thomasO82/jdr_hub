# Disponibilités et recherche de joueurs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la gestion privée des disponibilités et la recherche authentifiée de joueurs avec une compatibilité agrégée, sans exposer les horaires détaillés.

**Architecture:** Un module Hono `availability` séparera contrats de transport, services métier et repository Drizzle. Une migration additive stockera règles, exceptions et préférences ; les pages Next.js `/disponibilites` et `/joueurs` consommeront des clients serveur et des composants Tailwind dédiés, en réutilisant `AppShell`.

**Tech Stack:** pnpm, TypeScript strict, Hono, Zod, Drizzle ORM, PostgreSQL, Next.js App Router, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-05-availability-and-player-search-design.md`

## Global Constraints

- Respecter `AGENTS.md`, `docs/security/ai-access-policy.md` et `docs/security/security-requirements.md`.
- Écrire et exécuter les tests avant chaque implémentation métier (Red, Green, Refactor).
- Ne jamais renvoyer les plages ou exceptions d’un autre utilisateur dans `/players`.
- Les routes privées exigent une session ; `PUT /availability` exige l’origine autorisée.
- Les tableaux, minutes, fuseaux, libellés et paramètres de recherche ont des limites strictes.
- Les repositories API sont les seuls consommateurs de `packages/database`.
- Utiliser uniquement Tailwind dans l’interface ; conserver `AppShell` partagé et les polices du design system.
- Ne modifier aucune dépendance existante, aucune route existante ni aucun test fusionné.
- Créer une migration additive, transactionnelle et non destructive.

### Task 1: Contrats partagés et validation métier pure

**Files:**
- Create: `packages/shared/src/availability.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/availability.test.ts`
- Test: `apps/api/tests/unit/availability/policy.test.ts`

**Interfaces:**
- Produces `availabilityRuleSchema`, `availabilityExceptionSchema`, `availabilityPreferencesSchema`, `availabilityPayloadSchema`, `playerQuerySchema`, `playerSummarySchema` and their inferred types.
- Produces pure functions `validateAvailabilityRules(rules)` and `isCompatibleWithWindow(rules, query)` without imports Hono, Drizzle or `process.env`.

- [ ] **Step 1: Write failing tests** for valid multi-plages, `endMinute > startMinute`, jours 0–6, bornes 0–1440, overlap rejection, adjacent ranges, invalid timezone, positive exceptions, array limits, strict unknown properties, search pagination and aggregate compatibility.
- [ ] **Step 2: Run the focused tests** with `pnpm exec vitest run packages/shared/tests/availability.test.ts apps/api/tests/unit/availability/policy.test.ts`; confirm failures because the contracts and policy do not exist.
- [ ] **Step 3: Implement the minimal Zod schemas and pure interval helpers**. Use `Intl.DateTimeFormat(..., { timeZone })` to validate IANA names and compare half-open intervals without mutating input arrays.
- [ ] **Step 4: Rerun the focused tests** and confirm all validation and compatibility cases pass.
- [ ] **Step 5: Refactor names and TSDoc** while keeping the public types stable; rerun the same tests.
- [ ] **Step 6: Commit** with `git commit -m "test: define availability contracts and rules"` followed by the implementation commit if the diff is easier to review separately.

### Task 2: Schéma Drizzle et migration additive

**Files:**
- Create: `packages/database/src/schema/availability.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0004_availability-and-player-preferences.sql`
- Modify: `packages/database/migrations/meta/_journal.json`
- Create: `packages/database/migrations/meta/0004_snapshot.json`
- Test: `packages/database/tests/availability-schema.test.ts`

**Interfaces:**
- Produces `availabilitySchema` containing `availabilityRules`, `availabilityExceptions`, `userPreferences` and `userPreferredSystems`.
- Foreign keys reference `users.id`; deleting a user cascades only to that user’s availability and preferences.

- [ ] **Step 1: Write failing schema tests** for table exports, FK ownership, defaults (`availabilityPublic=false`, `invitationNotifications=true`), composite uniqueness, indexes and additive migration naming.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/database/tests/availability-schema.test.ts`; confirm the schema exports and migration are absent.
- [ ] **Step 3: Implement Drizzle tables** with `smallint`/`integer` minute columns, `timestamptz` exceptions, bounded `varchar` labels/systems, unique `(userId, system)` and indexes `(userId, dayOfWeek)` and `(userId, startsAt)`.
- [ ] **Step 4: Generate or author the migration** using the repository’s existing Drizzle migration convention; do not alter previous SQL or snapshots.
- [ ] **Step 5: Run schema tests and `pnpm --filter @jdr-hub/database typecheck`**; confirm green and verify the migration contains no destructive statement.
- [ ] **Step 6: Commit** with `feat: add availability database schema`.

### Task 3: Repository mémoire de test et services de remplacement

**Files:**
- Create: `apps/api/src/modules/availability/repository.ts`
- Create: `apps/api/src/modules/availability/services/get-availability.ts`
- Create: `apps/api/src/modules/availability/services/replace-availability.ts`
- Create: `apps/api/src/modules/availability/services/search-players.ts`
- Create: `apps/api/tests/helpers/in-memory-availability-repository.ts`
- Test: `apps/api/tests/unit/availability/services.test.ts`

**Interfaces:**
- `AvailabilityRepository` exposes `getForUser`, `replaceForUser`, and `searchPlayers` only.
- `AvailabilitySnapshot` contains the current user’s exact rules/exceptions/preferences; `PlayerSummary` contains only safe aggregate fields.
- `replaceForUser(userId, payload, now)` validates immutable input then performs one repository transaction.

- [ ] **Step 1: Write failing service tests** for idempotent replacement, user scoping, overlap rejection, exception ordering, public aggregate visibility, name/system filters, pagination and absence of precise slots in player results.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/api/tests/unit/availability/services.test.ts`; confirm failures because services/repository do not exist.
- [ ] **Step 3: Implement the in-memory repository helper** under `apps/api/tests/helpers` and pure services; never export it from production modules.
- [ ] **Step 4: Implement the PostgreSQL repository** using only Drizzle queries and a transaction. Return exact rows only for the requested authenticated user; calculate compatibility as a boolean/null aggregate for other users.
- [ ] **Step 5: Run focused service tests and database typecheck**; confirm no Hono or `Context` import exists in repository/services.
- [ ] **Step 6: Commit** with `feat: add availability services and repository boundary`.

### Task 4: Routes Hono, contrôleurs et protections

**Files:**
- Create: `apps/api/src/modules/availability/policy.ts`
- Create: `apps/api/src/modules/availability/handlers.ts`
- Create: `apps/api/src/modules/availability/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/tests/api/availability/routes.test.ts`

**Interfaces:**
- `registerAvailabilityRoutes(app, dependencies)` registers `GET /availability`, `PUT /availability` and `GET /players`.
- Dependencies include `authConfig`, `authRepository`, `repository` and optional `now`; handlers call `authenticateUser` and never access Drizzle directly.

- [ ] **Step 1: Write failing API tests** for 401 without session, successful GET, successful PUT with same-origin `Origin`, rejected foreign origin, strict body validation, generic errors, `/players` filters/pagination and sanitized aggregate results.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/api/tests/api/availability/routes.test.ts`; confirm failures because the routes are not registered.
- [ ] **Step 3: Implement route registration and handlers** following the existing auth/games patterns. Read cookies and headers in handlers, validate with shared Zod schemas, call services and return `{ data, error, meta.requestId }`.
- [ ] **Step 4: Wire the module** in `createApiApp` and `startApi` with the PostgreSQL repository; read `process.env` only in existing startup configuration.
- [ ] **Step 5: Run focused API tests**, then `pnpm --filter @jdr-hub/api typecheck`; confirm CSRF and generic error branches.
- [ ] **Step 6: Commit** with `feat: expose availability and player search api`.

### Task 5: Intégration PostgreSQL et migrations de test

**Files:**
- Test: `apps/api/tests/integration/availability/repository.test.ts`
- Modify: `packages/database/tests/index.test.ts` only if a new migration discovery assertion is required; preserve existing assertions.

**Interfaces:**
- Integration tests use the existing PostgreSQL test harness and only fake users/data.

- [ ] **Step 1: Write failing integration tests** for transaction replacement rollback, FK cleanup, unique systems, indexes, timezone persistence and concurrent replacement serialization.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/api/tests/integration/availability/repository.test.ts`; confirm failures until migration/schema are applied.
- [ ] **Step 3: Apply migration to the test database** using the existing database helper; do not modify production data or committed migrations.
- [ ] **Step 4: Complete the repository transaction implementation** only where integration evidence requires it.
- [ ] **Step 5: Rerun integration tests and the database package suite** with `pnpm --filter @jdr-hub/database test`.
- [ ] **Step 6: Commit** with `test: cover availability postgres persistence`.

### Task 6: Clients API et page disponibilités

**Files:**
- Create: `apps/web/lib/availability-api.ts`
- Create: `apps/web/features/availability/availability-grid.tsx`
- Create: `apps/web/features/availability/availability-view.tsx`
- Create: `apps/web/app/disponibilites/page.tsx`
- Test: `apps/web/tests/availability-api.test.ts`
- Test: `apps/web/tests/availability-pages.test.ts`
- Test: `apps/web/tests/availability-visual.test.ts`

**Interfaces:**
- `createAvailabilityApi({ baseUrl, fetcher })` exposes `get()` and `replace(payload)` with typed shared contracts.
- `AvailabilityView` receives an initial `AvailabilitySnapshot`; client state is limited to grid, exceptions, toggles and save feedback.

- [ ] **Step 1: Write failing client/page tests** for API URLs/methods, server page import, no database import, exact desktop labels, mobile day navigation, grid states, error/empty states and Tailwind-only classes.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/web/tests/availability-api.test.ts apps/web/tests/availability-pages.test.ts apps/web/tests/availability-visual.test.ts`; confirm failures.
- [ ] **Step 3: Implement the typed API client** with generic error handling and no browser exposure of internal database configuration.
- [ ] **Step 4: Implement the Server Component page** calling the API server-side and redirecting unauthenticated users to the existing connection flow.
- [ ] **Step 5: Implement the responsive grid** from the approved desktop/mobile mockups: state cycling, day selector, exceptions, preferences, accessible labels, focus states and save action.
- [ ] **Step 6: Run focused web tests and `pnpm --filter @jdr-hub/web typecheck`**; verify no CSS module or inline style is introduced.
- [ ] **Step 7: Commit** with `feat: add availability settings page`.

### Task 7: Recherche de joueurs et navigation

**Files:**
- Create: `apps/web/lib/players-api.ts`
- Create: `apps/web/features/players/player-search-view.tsx`
- Create: `apps/web/features/players/player-card.tsx`
- Create: `apps/web/app/joueurs/page.tsx`
- Modify: `apps/web/features/layout/app-shell.tsx`
- Test: `apps/web/tests/players-api.test.ts`
- Test: `apps/web/tests/players-pages.test.ts`
- Test: `apps/web/tests/players-visual.test.ts`

**Interfaces:**
- `createPlayersApi({ baseUrl, fetcher }).list(query)` returns `PlayersPage` with safe `PlayerSummary` values.
- `PlayerSearchView` receives initial results and keeps query state in the URL without exposing precise availability.

- [ ] **Step 1: Write failing tests** for query encoding, authenticated fetch options, page import, cards/filters/pagination, responsive mobile layout and absence of `startMinute`, `endMinute`, `exceptions` in rendered player data.
- [ ] **Step 2: Run focused player tests** and confirm they fail before the client/page exist.
- [ ] **Step 3: Implement API client and Server Component page** with bounded URL parameters and generic error/empty states.
- [ ] **Step 4: Implement Tailwind player cards and filters** matching the desktop/mobile mockups, with keyboard focus and accessible labels.
- [ ] **Step 5: Add `/joueurs` to the shared `AppShell` active navigation** without duplicating header/footer code.
- [ ] **Step 6: Run focused tests and web typecheck**; confirm only Tailwind classes and Lucide icons are used.
- [ ] **Step 7: Commit** with `feat: add player search page`.

### Task 8: Documentation, sécurité et vérification de livraison

**Files:**
- Modify: `docs/features/011-availability-and-player-search.md`
- Modify: `docs/project-status.md`
- Modify: `README.md` only if local commands or routes need documenting.

**Interfaces:**
- Documentation records only implemented behavior, exact commands/results, TDD evidence, security controls, manual verification and known limits.

- [ ] **Step 1: Add security/API regression tests** for request size, origin, 401/403, rate limiting hook and private-field projection; run them red before adding any missing control.
- [ ] **Step 2: Implement only the missing controls** identified by those tests; rerun targeted security suites.
- [ ] **Step 3: Execute the full checks:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, database integration tests, `pnpm audit --audit-level=high`, `git diff --check` and applicable Docker Compose checks.
- [ ] **Step 4: Review `git status`, staged diff, migrations, generated files and secret patterns** without opening forbidden `.env`, credential, log or personal-data files.
- [ ] **Step 5: Update the feature fiche to `IN_REVIEW` only after a Pull Request is actually open**, otherwise keep `IN_PROGRESS` and document the blocker; update project status and manual verification steps.
- [ ] **Step 6: Commit documentation** with `docs: record availability and player search verification`.

## Final integration checklist

- [ ] All focused tests were Red before their implementation and Green afterward.
- [ ] Existing auth, games, applications and infrastructure tests remain unchanged and pass.
- [ ] No precise availability of another user is present in API JSON, HTML, logs or SEO metadata.
- [ ] No handler imports Drizzle; no repository imports Hono; no service reads `process.env`.
- [ ] Migration is additive, reviewed and applied successfully to a test PostgreSQL database.
- [ ] Desktop/mobile pages match the approved maquettes and use only Tailwind for styling.
- [ ] Documentation and project status are complete before the PR.

## État d’exécution — 2026-09-05

- Tâches 1, 2, 3, 4, 6 et 7 réalisées sur `feat/availability-and-player-search`.
- Tâche 5 (scénario PostgreSQL dédié) reste à exécuter avec une base de test isolée.
- Les tests de schéma, services, API et composants sont verts ; aucun test
  existant n’a été supprimé ou affaibli.
- La vérification finale et l’ouverture de la Pull Request restent à faire.
