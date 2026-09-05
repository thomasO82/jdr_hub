# Séances, créneaux, votes et planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planifier des séances, voter des créneaux et afficher un planning personnel sans modifier les contrats existants.

**Architecture:** Le module Hono `scheduling` sépare contrats, politiques, handlers, services par cas d'usage et repository Drizzle. Les composants Next.js consomment des clients typés et réutilisent `AppShell`, avec calendrier desktop et agenda mobile.

**Tech Stack:** pnpm, TypeScript strict, Hono, Zod, Drizzle ORM, PostgreSQL, Next.js App Router, Tailwind CSS, Lucide, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-06-sessions-scheduling-design.md`

## Contraintes globales

- Respecter `AGENTS.md`, `docs/security/ai-access-policy.md` et `docs/security/security-requirements.md`.
- Écrire les tests Red avant chaque implémentation métier et conserver les tests existants inchangés.
- Stocker les instants en UTC et limiter les conversions au bord d'affichage.
- Autoriser les mutations seulement au MJ ou membre actif selon l'opération, avec origine stricte et validation Zod bornée.
- Les repositories sont les seuls consommateurs API de `packages/database` ; aucun service ne dépend de Hono ou de `process.env`.
- Ne modifier aucune dépendance, migration existante, route existante ou schéma existant autrement que par ajout F06.
- Utiliser Tailwind uniquement côté web et conserver le design system et `AppShell` partagés.

### Task 1: Contrats et règles pures

**Files:**
- Create: `packages/shared/src/scheduling.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/scheduling.test.ts`
- Test: `apps/api/tests/unit/scheduling/policy.test.ts`

**Interfaces:** `sessionStatusSchema`, `proposalStatusSchema`, `voteValueSchema`, `proposalInputSchema`, `fixedSessionInputSchema`, `planningQuerySchema`, `canCreateSession`, `validateSessionWindow`.

- [ ] Écrire les tests Red pour statuts, dates UTC, durée minimale/maximale, borne de période de planning, votes et limite one-shot.
- [ ] Exécuter `pnpm exec vitest run packages/shared/tests/scheduling.test.ts apps/api/tests/unit/scheduling/policy.test.ts` et constater l'échec attendu.
- [ ] Implémenter les schémas stricts et les fonctions pures sans Hono, Drizzle ni environnement.
- [ ] Rejouer les tests ciblés puis refactoriser les noms et TSDoc sans changer les contrats.
- [ ] Commiter `test: define scheduling contracts and rules` puis `feat: add scheduling contracts` si nécessaire.

### Task 2: Tables Drizzle et migration additive

**Files:**
- Create: `packages/database/src/schema/scheduling.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0005_scheduling.sql`
- Modify: `packages/database/migrations/meta/_journal.json`
- Create: `packages/database/migrations/meta/0005_snapshot.json`
- Test: `packages/database/tests/scheduling-schema.test.ts`

**Interfaces:** `schedulingSchema` exporte `timeProposals`, `timeVotes` et `gameSessions` avec clés étrangères vers `games` et `users`.

- [ ] Écrire les tests Red pour exports, colonnes, statuts, cascade ciblée, unicité `(proposalId,userId)` et index dates/partie/statut.
- [ ] Exécuter le test de schéma et vérifier l'échec attendu.
- [ ] Implémenter les tables avec `timestamptz`, `varchar` bornés, contraintes et index sans modifier les tables existantes.
- [ ] Générer la migration avec la convention Drizzle existante et vérifier qu'elle est additive.
- [ ] Exécuter tests et `pnpm --filter @jdr-hub/database typecheck`, puis commiter `feat: add scheduling database schema`.

### Task 3: Repository et services métier

**Files:**
- Create: `apps/api/src/modules/scheduling/repository.ts`
- Create: `apps/api/src/modules/scheduling/services/create-proposals.ts`
- Create: `apps/api/src/modules/scheduling/services/list-proposals.ts`
- Create: `apps/api/src/modules/scheduling/services/cast-vote.ts`
- Create: `apps/api/src/modules/scheduling/services/create-session.ts`
- Create: `apps/api/src/modules/scheduling/services/select-proposal.ts`
- Create: `apps/api/src/modules/scheduling/services/get-planning.ts`
- Create: `apps/api/tests/helpers/in-memory-scheduling-repository.ts`
- Test: `apps/api/tests/unit/scheduling/services.test.ts`

**Interfaces:** `SchedulingRepository` expose les lectures/écritures nécessaires aux services ; chaque service reçoit ses dépendances explicitement et retourne des types partagés.

- [ ] Écrire les tests Red pour membre/MJ, partie fermée, limite one-shot, double vote, vote après clôture, compteurs, sélection et idempotence.
- [ ] Exécuter les tests ciblés et confirmer leur échec.
- [ ] Implémenter le helper mémoire uniquement sous `apps/api/tests/helpers` et les services sans accès direct à Hono/Drizzle.
- [ ] Implémenter le repository PostgreSQL avec transactions et verrous pour clôture/sélection, contraintes uniques pour les votes.
- [ ] Rejouer les tests, vérifier l'absence d'import `Context` dans repository/services, puis commiter `feat: add scheduling services and repository`.

### Task 4: Routes Hono et protections API

**Files:**
- Create: `apps/api/src/modules/scheduling/policy.ts`
- Create: `apps/api/src/modules/scheduling/handlers.ts`
- Create: `apps/api/src/modules/scheduling/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/tests/api/scheduling/routes.test.ts`

**Interfaces:** `registerSchedulingRoutes(app, dependencies)` enregistre les cinq routes F06 ; les handlers lisent cookies/en-têtes, valident le transport, appellent les services et construisent les réponses communes.

- [ ] Écrire les tests Red pour 401/403/404/409/429, origine, payloads invalides, droits MJ/membre et format de réponse.
- [ ] Exécuter la suite API ciblée et constater l'échec attendu.
- [ ] Implémenter handlers/routes et rate limiting en reprenant les conventions existantes.
- [ ] Enregistrer le module dans `createApiApp` et `startApi` avec le repository injecté ; ne pas lire `process.env` dans le module.
- [ ] Exécuter tests API et typecheck API, puis commiter `feat: expose scheduling api`.

### Task 5: Intégration PostgreSQL

**Files:**
- Create: `apps/api/tests/integration/scheduling/repository.test.ts`

- [ ] Écrire les tests Red pour contraintes, transaction de sélection, rollback, concurrence de clôture et idempotence.
- [ ] Exécuter la suite avec le harness PostgreSQL existant et documenter l'échec si la base de test n'est pas disponible.
- [ ] Appliquer la migration à la base de test isolée et compléter uniquement les corrections révélées par les tests.
- [ ] Exécuter `pnpm --filter @jdr-hub/database test` et les tests d'intégration ciblés, puis commiter `test: cover scheduling postgres persistence`.

### Task 6: Planning web

**Files:**
- Create: `apps/web/lib/planning-api.ts`
- Create: `apps/web/features/planning/planning-view.tsx`
- Create: `apps/web/features/planning/month-calendar.tsx`
- Create: `apps/web/features/planning/session-card.tsx`
- Create: `apps/web/app/planning/page.tsx`
- Test: `apps/web/tests/planning-api.test.ts`
- Test: `apps/web/tests/planning-pages.test.ts`
- Test: `apps/web/tests/planning-visual.test.ts`

- [ ] Écrire les tests Red pour URL/pagination/date, page `/planning`, calendrier, agenda mobile, états vides/erreur et classes Tailwind.
- [ ] Exécuter les tests web ciblés et confirmer l'échec attendu.
- [ ] Implémenter le client typé et la page Server Component avec redirection auth conforme aux pages privées.
- [ ] Implémenter le calendrier desktop, l'agenda mobile, les cartes, la légende et les contrôles clavier selon les maquettes.
- [ ] Exécuter les tests ciblés et le typecheck web, puis commiter `feat: add responsive planning page`.

### Task 7: Vote de créneaux web

**Files:**
- Create: `apps/web/lib/scheduling-api.ts`
- Create: `apps/web/features/scheduling/proposal-vote-view.tsx`
- Create: `apps/web/features/scheduling/proposal-matrix.tsx`
- Create: `apps/web/features/scheduling/proposal-card.tsx`
- Modify: `apps/web/features/layout/app-shell.tsx` only if the active planning link requires it
- Test: `apps/web/tests/scheduling-api.test.ts`
- Test: `apps/web/tests/scheduling-pages.test.ts`
- Test: `apps/web/tests/scheduling-visual.test.ts`

- [ ] Écrire les tests Red pour lecture, vote, matrice desktop, cartes mobile, progression, états et absence de données privées.
- [ ] Exécuter les tests ciblés et constater l'échec attendu.
- [ ] Implémenter les clients et composants Tailwind avec boutons accessibles et gestion d'erreur générique.
- [ ] Vérifier que les choix sont soumis avec l'origine attendue et qu'aucune règle de disponibilité détaillée n'est rendue.
- [ ] Exécuter tests web et typecheck, puis commiter `feat: add scheduling vote interface`.

### Task 8: Vérification, documentation et livraison

**Files:**
- Modify: `docs/features/012-sessions-scheduling.md`
- Modify: `docs/project-status.md`

- [ ] Ajouter les résultats Red/Green/Refactor, scénarios de sécurité et procédure manuelle dans la fiche.
- [ ] Exécuter `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, tests PostgreSQL disponibles, `pnpm audit --audit-level=high` et `git diff --check`.
- [ ] Relire le diff, les migrations et les fichiers non suivis sans ouvrir de fichier interdit ou secret.
- [ ] Passer F06 à `IN_REVIEW` uniquement après ouverture réelle de la PR ; sinon documenter le blocage et garder `IN_PROGRESS`.
- [ ] Commiter `docs: record scheduling verification`, pousser la branche dédiée et tenter la PR vers `develop` sans fusionner.

## Definition of Done

- [ ] Tests Red vérifiés avant chaque implémentation, tests existants inchangés et suite complète verte.
- [ ] Contrats HTTP, sécurité, UTC/fuseau et règles one-shot/campagne vérifiés.
- [ ] Calendrier desktop, agenda mobile et vote correspondent aux maquettes et restent accessibles au clavier.
- [ ] Aucun secret, dépendance ou modification destructive n'est introduit.
- [ ] Fiche et tableau global documentés, branche poussée et PR ouverte ou blocage GitHub documenté.
