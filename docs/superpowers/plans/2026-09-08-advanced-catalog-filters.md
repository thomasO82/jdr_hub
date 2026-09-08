# Filtres avancés du catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer tous les filtres du catalogue public de l’interface jusqu’à la requête PostgreSQL et afficher les résultats correspondants.

**Architecture:** Le contrat Zod partagé décrit les filtres ; le client SSR sérialise l’URL ; Hono valide et transmet la requête ; le repository PostgreSQL filtre type, format, système, séances et membres actifs avant pagination. Le format est persisté sur `games` et les cartes utilisent la projection publique calculée.

**Tech Stack:** Next.js App Router, React Server Components, Hono, TypeScript strict, Zod, Drizzle ORM, PostgreSQL, Vitest, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-09-08-advanced-catalog-filters-design.md`

## Global Constraints

- Les filtres sont validés par Zod et les propriétés inconnues sont rejetées.
- Les tags utilisent une logique `AND`.
- Les parties publiques sont limitées à la visibilité `PUBLIC` et aux statuts `OPEN`/`ACTIVE`.
- Les requêtes SQL sont paramétrées et les projections publiques n’exposent pas de données privées.
- Aucun filtre de niveau n’est ajouté.
- Les migrations sont additives et exécutées avant le démarrage de l’API.

---

### Task 1: Contract and persistence

**Files:**
- Modify: `packages/shared/src/games.ts`
- Modify: `packages/shared/src/public-games.ts`
- Modify: `packages/database/src/schema/games.ts`
- Create: `packages/database/migrations/0010_lyrical_karnak.sql`
- Test: `packages/shared/tests/games.test.ts`, `packages/shared/tests/public-games.test.ts`, `packages/database/tests/games-schema.test.ts`

- [x] Define `ONLINE`/`TABLE`, query bounds, ISO dates and date ordering.
- [x] Add the migration-safe `games.format` column with the `ONLINE` default and index.
- [x] Verify rejection of invalid and unknown filter values.

### Task 2: API repository and public projection

**Files:**
- Modify: `apps/api/src/modules/games/repository.ts`
- Modify: `apps/api/tests/helpers/in-memory-games-repository.ts`
- Test: `apps/api/tests/api/games/public-routes.test.ts`
- Test: `apps/api/tests/integration/postgres-public-games-filters.test.ts`

- [x] Filter type, format and system with cumulative conditions.
- [x] Filter future `SCHEDULED` sessions by date range.
- [x] Compute available places from active members before pagination.
- [x] Expose only format, available places and next session in the public projection.
- [x] Verify the same behavior with the in-memory route tests and PostgreSQL integration.

### Task 3: URL client and catalogue UI

**Files:**
- Create: `apps/web/features/games/catalogue-filter-query.ts`
- Modify: `apps/web/lib/public-games-api.ts`
- Modify: `apps/web/features/games/games-list-view.tsx`
- Modify: `apps/web/features/games/new-game-view.tsx`
- Modify: `apps/web/features/games/game-detail-view.tsx`
- Modify: `apps/web/app/parties/page.tsx`
- Modify: `apps/web/lib/public-seo.ts`
- Test: `apps/web/tests/catalogue-filter-query.test.ts`, `apps/web/tests/public-games-api.test.ts`, `apps/web/tests/games-pages.test.ts`, `apps/web/tests/public-seo.test.ts`

- [x] Serialize every filter into the shared query contract.
- [x] Restore selected filters from URL search parameters.
- [x] Add system, date and available-place controls and remove decorative `visual*` names.
- [x] Persist the selected format when creating a game.
- [x] Display format, available places and next session in catalogue/detail cards.
- [x] Keep filtered combinations non-indexable.

### Task 4: Verification and documentation

**Files:**
- Modify: `vitest.config.ts`
- Modify: `vitest.integration.config.ts`
- Modify: `docs/project-status.md`
- Create: `docs/features/017-advanced-catalog-filters.md`

- [x] Exclude PostgreSQL suites from the default test run and include them in the sequential integration configuration.
- [x] Run normal tests, PostgreSQL integration tests, lint, typecheck, build and `git diff --check`.
- [x] Document TDD evidence, security controls, limits and commands.
