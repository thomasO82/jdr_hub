# Games and Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter le module `games` et les tags relationnels sans modifier les contrats d’authentification existants.

**Architecture:** Les contrats partagés sont définis dans `packages/shared`. L’API Hono suit `routes -> handlers -> services -> repository`; PostgreSQL est la seule persistance de production.

**Tech Stack:** TypeScript strict, Hono, Zod, Drizzle ORM, PostgreSQL, Vitest, pnpm.

**Spec:** `docs/implementation-plan.md` section F02 et `docs/specifications/cahier-des-charges.md` sections 20–21.

## Global Constraints

- `ONE_SHOT` accepte au plus trois séances ; `CAMPAIGN` n’a pas de maximum.
- Les tags sont stockés dans `tags` et `game_tags`, avec slugs normalisés uniques.
- Les filtres multi-tags utilisent `AND`.
- Toute entrée API est validée par Zod strict avec limites.
- Toute modification exige une autorisation par ressource côté serveur.
- Aucune dépendance, migration destructive ou donnée sensible n’est ajoutée.

### Task 1: Shared game contracts

**Files:** Create `packages/shared/src/games.ts`; test `packages/shared/tests/games.test.ts`; modify package exports if required.

- [ ] Écrire les tests rouges pour enums, champs obligatoires, limites et propriétés inconnues.
- [ ] Implémenter les schémas Zod stricts `createGameSchema`, `updateGameSchema`, `gameQuerySchema` et les enums `GameType`, `GameStatus`, `GameVisibility`.
- [ ] Exécuter `pnpm --filter @jdr-hub/shared test` puis le typecheck.

### Task 2: Database schema and migration

**Files:** Create/modify `packages/database/src/schema/games.ts`, `packages/database/src/schema/tags.ts`, exports and migration files.

- [ ] Écrire les tests d’intégration des tables, relations, uniques et index.
- [ ] Ajouter `games`, `tags`, `game_tags` avec FK, slug unique et timestamps.
- [ ] Générer une migration Drizzle non destructive et vérifier le schéma sans modifier les tables auth.

### Task 3: Games repository

**Files:** Create `apps/api/src/modules/games/repository.ts`; test `apps/api/tests/integration/games/repository.test.ts`.

- [ ] Tester création, lecture, mise à jour propriétaire, archivage, visibilité et recherche `AND` des tags.
- [ ] Implémenter uniquement les opérations de persistance Drizzle, sans Hono ni `process.env`.
- [ ] Vérifier les projections et la pagination bornée.

### Task 4: Application services

**Files:** Create `apps/api/src/modules/games/services/*.ts`; unit tests under `apps/api/tests/unit/games/`.

- [ ] Tester création, édition, transitions, permissions et limites métier avant implémentation.
- [ ] Implémenter les services avec dépendances injectées et erreurs métier explicites.
- [ ] Garantir qu’aucun champ protégé ne peut être mass-assigned.

### Task 5: Hono transport

**Files:** Create `apps/api/src/modules/games/routes.ts`, `handlers.ts`; API tests under `apps/api/tests/api/games/`; modify API composition.

- [ ] Tester les routes publiques et protégées, statuts 400/401/403/404/409 et format d’erreur.
- [ ] Déclarer `GET/POST /games`, `GET/PATCH/DELETE /games/:id` et `GET /tags`.
- [ ] Garder les handlers limités à la validation transport, l’appel service et la réponse HTTP.

### Task 6: Documentation and verification

- [ ] Mettre à jour la fiche F02 avec les résultats Red/Green/Refactor et la sécurité.
- [ ] Exécuter tests, lint, typecheck, build, audit du diff et contrôle des secrets.
- [ ] Committer en petits commits puis pousser `feat/games-and-tags`.
