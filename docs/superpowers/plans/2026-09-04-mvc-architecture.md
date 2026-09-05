# MVC Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réorganiser le monorepo autour de responsabilités MVC explicites sans changer le comportement observable.

**Architecture:** Hono conserve des routes minimales et délègue aux handlers, qui appellent des cas d’usage sans dépendance Hono. Next.js conserve App Router et déplace le rendu vers des features. Les tests quittent le code de production et sont rangés par application, niveau et module.

**Tech Stack:** TypeScript strict, Hono, Vitest, Next.js App Router, Drizzle, Zod.

**Spec:** `docs/superpowers/specs/2026-09-04-mvc-architecture-design.md`

## Global Constraints

- Ne pas modifier les chemins, méthodes, réponses, statuts, redirections, cookies ou règles de sécurité de l’API.
- Ne pas ajouter de dépendance, migration ou changement de schéma.
- Lire `process.env` uniquement dans `apps/api/src/index.ts`.
- Conserver les assertions existantes lors des déplacements de tests.
- Ne pas inclure `.env` ou une valeur sensible dans les tests, commits ou rapports.

---

### Task 1: Document MVC and isolate test support

**Files:**
- Modify: `AGENTS.md`
- Create: `apps/api/tests/helpers/auth-fixtures.ts`
- Create: `apps/api/tests/helpers/in-memory-auth-repository.ts`
- Modify: `apps/api/src/modules/auth/repository.ts`

**Interfaces:**
- Produces `createAuthFixtures()` with a fake `AuthConfig`, clock and Discord identity.
- Produces `createInMemoryAuthRepository(): AuthRepository` for tests only.
- Removes the test-only in-memory repository from production exports.

- [ ] Write the test-helper imports in one moved repository test and run it; it must fail because the helper does not exist.
- [ ] Create the fixtures and move the in-memory implementation unchanged from `repository.ts` to the test helper.
- [ ] Keep `AuthRepository` and `createPostgresAuthRepository` as production-only exports.
- [ ] Run the moved repository tests and confirm rotation, replay handling, expiry and digest assertions still pass.
- [ ] Add MVC dependency rules to `AGENTS.md`: routes → handlers → use-case services → repositories; no Hono in services/repositories; pages are routes and features are views.
- [ ] Commit the isolated test support and documentation.

### Task 2: Extract specialized services and cookie boundary

**Files:**
- Create: `apps/api/src/modules/auth/cookies.ts`
- Move: `access-token.ts`, `session-service.ts`, `oauth.ts` to `services/`
- Create: `apps/api/src/modules/auth/services/start-discord-login.ts`
- Create: `apps/api/src/modules/auth/services/complete-discord-login.ts`
- Create: `apps/api/src/modules/auth/services/authenticate-user.ts`
- Create: `apps/api/src/modules/auth/services/refresh-session.ts`
- Create: `apps/api/src/modules/auth/services/logout-session.ts`
- Test: `apps/api/tests/unit/auth/services/*.test.ts`

**Interfaces:**
- Every use case receives `{ config, repository, now, fetchDiscordIdentity }` explicitly as needed and returns data, never a Hono `Response` or `Context`.
- `cookies.ts` exports access/refresh readers plus `setAuthCookies` and `clearAuthCookies`.

- [ ] Move one unit test with its specialized service, update its import, and verify it is discovered from `apps/api/tests/unit/auth/services`.
- [ ] Move JWT, session and OAuth utilities to `services/` without changing their exports or assertions.
- [ ] Write failing use-case tests for each public result: Discord start redirect data, completed login credentials, authenticated user lookup, rotated credentials and logout result.
- [ ] Implement the five use cases by moving the corresponding orchestration from `routes.ts`; preserve generic failures as `null` or a typed failure result rather than exposing a cause.
- [ ] Extract cookie names, paths, expirations and security attributes into `cookies.ts`, then verify the existing cookie assertions pass unchanged.
- [ ] Run unit and API auth tests; commit the service and cookie boundary.

### Task 3: Make handlers controllers and reduce routes to declarations

**Files:**
- Create: `apps/api/src/modules/auth/handlers.ts`
- Modify: `apps/api/src/modules/auth/routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/api/auth/routes.test.ts`
- Test: `apps/api/tests/api/auth/routes-jwt.test.ts`

**Interfaces:**
- `createAuthHandlers(dependencies: AuthDependencies)` returns `discordLogin`, `discordCallback`, `getCurrentUser`, `logout` and `refreshSession` Hono handlers.
- `registerAuthRoutes(app, dependencies)` only creates handlers and attaches the five existing paths.

- [ ] Move the route API tests first and run them; their initial failure must be only an import-path failure caused by the test move.
- [ ] Implement handlers that validate query input, read headers/cookies, invoke a single use case, set or clear cookies and produce the existing Hono response.
- [ ] Replace `routes.ts` with five route declarations and dependency injection only.
- [ ] Verify all existing API tests pass with identical statuses, response envelopes, redirects and cookie attributes.
- [ ] Commit the controller and routing split.

### Task 4: Relocate all tests and retain type/build boundaries

**Files:**
- Move: API tests to `apps/api/tests/{api,integration,unit}/`
- Move: package tests to `packages/shared/tests/` and `packages/database/tests/`
- Move: web smoke tests to `apps/web/tests/`
- Modify: affected package scripts and TypeScript build exclusions

- [ ] Move tests without changing their assertions or data; adjust imports only for their new paths.
- [ ] Keep root `tests/architecture` and `tests/infrastructure` as cross-workspace checks.
- [ ] Update test commands so Vitest discovers each new application/package test directory.
- [ ] Update build configurations so test files are never emitted in production artifacts.
- [ ] Run the complete suite and verify its scenario count is unchanged except for intentionally added service-characterisation tests.
- [ ] Commit test relocation separately from production code.

### Task 5: Reorganize Next.js views into features

**Files:**
- Create: `apps/web/features/home/home-view.tsx`
- Create: `apps/web/features/authentication/connection-view.tsx`
- Move: connection page stylesheet beside `connection-view.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/connexion/page.tsx`
- Test: `apps/web/tests/`

- [ ] Move the current markup into feature views before changing the route files.
- [ ] Keep `page.tsx` files as App Router entries containing metadata and one feature-view composition call.
- [ ] Preserve all rendered text, semantic elements, logo path, OAuth link and CSS behavior.
- [ ] Run the web smoke tests and build to confirm server rendering and metadata remain unchanged.
- [ ] Commit the frontend view boundary.

### Task 6: Verification and tracking

**Files:**
- Modify: `docs/features/003-jwt-session-security.md`
- Modify: `docs/project-status.md`

- [ ] Review the final diff for unexpected API, schema, dependency, migration and secret changes.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`.
- [ ] Update feature tracking with real file moves, TDD evidence, commands, results, security controls and remaining limitations.
- [ ] Create a final commit, push the branch and open the Pull Request to `develop` with the GitHub connector.
