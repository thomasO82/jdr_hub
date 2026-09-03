# F00 — Socle monorepo, Docker et CI sécurisée

## Identifiant

F00

## Statut

`IN_PROGRESS`

## Branche

`fix/f00-hardening`, créée depuis l’état vérifié de `develop` le 2026-09-03.

## Lien ou numéro de Pull Request

Non créée à ce stade — la Pull Request ciblera `develop` après les vérifications finales.

## Dates de début et de fin

- Début : 2026-09-02
- Fin : Non terminée — PR non créée

## Dépendances

### Prévues

- Aucune fonctionnalité applicative.
- `develop` à jour depuis `main`.

### Réalisées ou constatées

- `develop` existe et suit `origin/develop`.

### Restantes

- Aucune dépendance fonctionnelle ; les outils de développement seront installés dans cette fiche au fil de F00.

## Contexte

### Prévu

Établir un socle reproductible pour le MVP JDR Hub avant l’authentification et les modules métier.

### Réalisé

La conception F00 est validée. Le workspace pnpm strict, les scripts racine,
les quatre frontières de répertoires et les packages `@jdr-hub/shared` et
`@jdr-hub/database` sont en place. Les tests d’architecture protègent aussi
la séparation du code navigateur et du code de base de données.

### Restant à faire

La pile Docker, le routage same-origin, la couche Drizzle minimale et les
gates CI sont implémentés ; l’ouverture de la PR reste à faire.

## Besoin utilisateur

### Prévu

Fournir une base technique installable, testable et reproductible pour développer JDR Hub en sécurité.

### Réalisé

Le socle de packages, l’API technique et le shell web sont disponibles pour
les développements suivants ; aucun comportement métier n’est encore exposé.

### Restant à faire

Rendre le socle complet exécutable localement et vérifiable par CI.

## Périmètre prévu

- Workspace pnpm strict.
- `apps/web` avec Next.js App Router.
- `apps/api` avec Hono et endpoint de santé.
- `packages/shared` pour les contrats partagés.
- `packages/database` préparé sans modèle métier définitif.
- `packages/ui` uniquement si un composant partagé est nécessaire au socle.
- PostgreSQL non exposé publiquement.
- Routage `/` vers Next.js et `/api/*` vers Hono sous le même domaine local.
- Docker Compose avec `web-next`, `api-hono`, `postgres` et reverse proxy local si nécessaire.
- `.env.example` factice, `.dockerignore`, images épinglées, conteneurs non-root et healthchecks.
- CI GitHub Actions pour installation, lint, TypeScript, tests, builds, audit, scan de secrets, analyse statique et scan d’images.

## Fonctionnalités effectivement réalisées

- La branche `chore/monorepo-foundation` a été créée depuis `develop`.
- La conception et les critères de F00 sont documentés.
- Le workspace pnpm et sa configuration TypeScript stricte sont implémentés.
- `packages/shared` et `packages/database` disposent de manifests, tsconfigs
  et points d’entrée stables.
- `apps/api` expose `GET /health` avec une enveloppe stable, un identifiant de
  requête et un bootstrap Node validant `PORT`.
- Les tests d’architecture vérifient les workspaces, les dépendances locales
  interdites et l’absence d’import serveur depuis les sources navigateur.
- Docker Compose définit `web-next`, `api-hono` et `postgres`; PostgreSQL
  n’expose aucun port hôte et reste isolé sur un réseau interne.
- Les images web et API utilisent des builds multi-stage et un runtime
  non-root. Les trois services disposent de healthchecks.
- Caddy publie un unique point d’entrée local et route `/` vers Next.js et
  `/api/*` vers Hono.
- Drizzle et PostgreSQL disposent d’une fabrique serveur validant
  `DATABASE_URL` ; aucun schéma métier n’est ajouté.
- La CI GitHub Actions exécute les contrôles qualité, audit, scans de secrets,
  code et images avec permissions minimales.

## Parcours utilisateur

### Prévu

Un développeur clone le dépôt, fournit uniquement des valeurs factices ou des secrets par l’environnement, démarre le socle avec Docker Compose, vérifie `/` et `/api/health`, puis exécute les contrôles pnpm.

### Réalisé

Le parcours développeur est disponible : installation pnpm, tests d’architecture,
API `/health`, shell web, routage same-origin, vérifications TypeScript/Next.js
et démarrage des quatre services Docker sont reproductibles.

### Restant à faire

Relancer le parcours complet sur la branche finale avant la PR.

## Règles métier

### Prévues

- Aucun modèle métier définitif dans F00.
- Hono reste un monolithe modulaire ; aucun microservice.
- Le frontend ne doit jamais importer `packages/database` dans du code navigateur.

### Implémentées

- Aucune règle métier applicative ; cette fiche ne présente pas la conception comme implémentée.

### Non couvertes ou reportées

- Authentification, parties, tags, candidatures, séances, disponibilités, planning, notifications et XP sont reportés aux fonctionnalités suivantes.

## Architecture et choix techniques

### Prévu

Monorepo pnpm avec Next.js App Router, Hono REST, packages TypeScript partagés, Drizzle préparé pour PostgreSQL, Docker Compose et reverse proxy local pour le routage par chemin.

### Réalisé

 Le workspace pnpm, les options TypeScript strictes et les frontières
 `@jdr-hub/shared`/`@jdr-hub/database` sont implémentés. Le package database
 fournit une fabrique Drizzle validée sans modèle métier, l’API Hono possède
 son endpoint de santé et sa limite de corps, le proxy route le trafic local et
 le shell Next.js rend la page technique avec le logo officiel.

### Restant à faire

Maintenir les versions et les scans à jour lors des fonctionnalités suivantes.

## Modèle de données et migrations

### Prévu

Préparer l’accès Drizzle et PostgreSQL sans créer de migration métier. Les tables `users`, `games`, `game_sessions` et autres seront ajoutées par les fonctionnalités concernées.

### Réalisé

Aucun schéma ni migration créé ; la frontière package est préparée sans
introduire de modèle métier.

### Restant à faire

Ajouter la connectivité de test minimale sans introduire prématurément le modèle métier.

## Routes API

### Prévues

- `GET /api/health` — santé de l’API et format de réponse de base.
- `/api/*` — routage réservé à Hono sous le domaine local partagé.

### Implémentées

- `GET /health` — route interne Hono avec enveloppe `{ data, error, meta }`
  et `requestId` par requête.
- Les réponses 404 et 500 utilisent également un `requestId`.

### Restantes

 - Ajouter les routes métier et leur autorisation dans les fonctionnalités
   suivantes.

## Interface et composants

### Prévus

- Page Next.js minimale confirmant le démarrage du web.
- Page d’erreur de base si elle est nécessaire au shell technique.

### Réalisés

- Le shell technique Next.js rend une page Server Component avec un landmark
  `main`, un message de démarrage en français et le logo officiel.

### Restants

- Les écrans fonctionnels et les états de base restent à créer ; le shell
  technique est en place.

## Tests

### Prévus

- Test d’architecture des frontières workspace et de l’absence d’import navigateur vers `packages/database`.
- Smoke test du routage `/` et `/api/health`.
- Tests de configuration sans secret.
- Tests négatifs CI pour secret détecté, image non épinglée et conteneur root.
- Vérifications Compose/PostgreSQL et builds web/API.

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `CI=true pnpm install --frozen-lockfile` | Réussi avec pnpm 11.25.0 | 2026-09-02 |
| `CI=true pnpm --filter @jdr-hub/api test` | Réussi : 7 tests dans 2 fichiers | 2026-09-02 |
| `CI=true pnpm --filter @jdr-hub/api typecheck` | Réussi | 2026-09-02 |
| `CI=true pnpm --filter @jdr-hub/api build` | Réussi | 2026-09-02 |
| `CI=true pnpm --filter @jdr-hub/web test` | Réussi : 1 test dans 1 fichier | 2026-09-02 |
| `CI=true pnpm --filter @jdr-hub/web typecheck` | Réussi | 2026-09-02 |
| `CI=true pnpm --filter @jdr-hub/web build` | Réussi ; route statique `/` générée | 2026-09-02 |
| `CI=true pnpm build` | Réussi ; builds API et web exécutés via les workspaces | 2026-09-02 |
| `CI=true pnpm exec vitest run tests/architecture/workspace.test.ts tests/architecture/database-boundary.test.ts --exclude '.superpowers/**'` | Réussi : 5 tests dans 2 fichiers | 2026-09-02 |
 | `CI=true pnpm typecheck` | Réussi | 2026-09-02 |
| `git diff --check` | Réussi | 2026-09-02 |
| `pnpm vitest run tests/infrastructure/compose-config.test.ts` | Réussi : 5 tests | 2026-09-03 |
| `pnpm test` | Réussi : 28 tests dans 10 fichiers | 2026-09-03 |
| `pnpm lint` | Réussi sur les 4 workspaces | 2026-09-03 |
| `pnpm build` | Réussi : API et Next.js 16.2.11 | 2026-09-03 |
| `pnpm typecheck` | Réussi | 2026-09-03 |
| `pnpm audit --audit-level=high` | Réussi : aucune vulnérabilité connue | 2026-09-03 |
| `curl --fail http://127.0.0.1:18080/` et `/api/health` | Réussi via Caddy, Next.js et Hono | 2026-09-03 |
| `pnpm build` | Réussi : builds API et Next.js | 2026-09-03 |
| `docker compose -f docker-compose.yml config --quiet` | Réussi, aucune sortie sensible | 2026-09-03 |
| `docker compose -f docker-compose.yml build web-next api-hono` | Réussi : 2 images construites | 2026-09-03 |
| `docker compose -f docker-compose.yml up -d --wait` | Réussi : 3 services sains | 2026-09-03 |

### Restants

- Les tests d’intégration PostgreSQL réelle et l’exécution sur GitHub Actions
  doivent être confirmés dans l’environnement cible.

## Preuve TDD Red, Green, Refactor

### Red

- Test écrit avant l’implémentation : test d’architecture des packages et de
  leurs points d’entrée.
- Commande exécutée sur le snapshot propre `f99f100` :
  `CI=true pnpm exec vitest run .superpowers/sdd/2026-09-02-monorepo-foundation/task-2-red-baseline.test.ts`.
- Échec initial : `packages/shared/package.json` absent, comme attendu.

### Green

- Implémentation minimale : manifests, tsconfigs et points d’entrée vides des
  deux packages, plus les tests de frontière.
- Résultat : 5 tests passants dans 2 fichiers et `pnpm typecheck` réussi.

### Refactor

- Le détecteur d’imports serveur est centralisé dans
  `tests/architecture/helpers/database-boundary.ts` pour éviter la duplication.
- Résultat final : tests ciblés, typecheck et contrôle du diff réussis.

### Évolution datée — Shell Next.js, 2026-09-02

- Red : `tests/smoke/web-shell.test.ts` échouait avec `ENOENT` avant la
  création de `apps/web/app/page.tsx`.
- Green : le smoke test passe ; typecheck et build Next.js passent.
- Refactor : le shell reste un Server Component minimal, sans logique métier,
  sans import database et sans HTML injecté.

### Évolution datée — API Hono, 2026-09-02

- Red : le test `apps/api/src/app.test.ts` échouait avant `createApiApp` avec
  le module introuvable ; la configuration de port a ensuite reçu ses cas
  invalides.
- Green : `@jdr-hub/api test` passe avec 7 tests ; typecheck et build passent.
- Refactor : le `requestId` est produit par middleware, le bootstrap est
  séparé de l’export package, et `PORT` est validé dans un module dédié.

### Évolution datée — Docker Compose, 2026-09-03

- Red : `pnpm vitest run tests/infrastructure/compose-config.test.ts`
  échouait avec 5 assertions car `docker-compose.yml` était absent.
- Green : les 5 tests passent après ajout des trois services, de l’isolation
  PostgreSQL et des healthchecks. Les images web/API se construisent et les
  trois conteneurs atteignent l’état `healthy`.
- Refactor : le helper de test a été corrigé après reproduction d’un défaut
  d’extraction sur les lignes YAML vides. `next.config.ts` a été remplacé par
  `next.config.mjs`, format officiellement supporté, afin que le runtime web
  n’installe aucune dépendance de développement au démarrage.

## Contrôles de sécurité

### Prévus

- Aucun secret dans le dépôt, les Dockerfiles, Compose, les logs ou les workflows.
- `.env.example` limité à des noms de variables et valeurs manifestement factices.
- PostgreSQL sur réseau interne, sans exposition publique par défaut.
- Images épinglées, builds multi-stage, conteneurs non-root, capacités minimales et healthchecks.
- Permissions minimales du `GITHUB_TOKEN` et scans CI.
- Taille de corps et format d’erreur contrôlés sans fuite d’informations internes.

### Réalisés

- La politique d’accès de l’IA a été consultée.
- Aucun motif de secret n’a été détecté dans les documents de cette phase.
- PostgreSQL n’a aucun port publié et utilise un réseau Docker interne.
 - Les conteneurs applicatifs s’exécutent avec l’utilisateur non-root `node`,
   abandonnent toutes les capacités Linux et activent `no-new-privileges` ; le
   proxy n’ajoute que `NET_BIND_SERVICE` pour son binaire officiel.
- Les images utilisent des versions précises, des builds multi-stage et des
  dépendances runtime séparées des dépendances de construction.
- `.dockerignore` exclut environnements, journaux, dumps et artefacts locaux ;
  `.env.example` contient uniquement des valeurs locales factices.
- Les healthchecks ont été observés verts sans lecture des logs de conteneurs.

### Restants ou limites

- Le compte PostgreSQL local d’amorçage reste à séparer explicitement d’un
  futur compte applicatif à privilèges minimaux lors de l’ajout de Drizzle.
- Les scans CI sont définis ; leur exécution dépend de l’environnement GitHub.

## Documentation technique consultée

- `docs/specifications/cahier-des-charges.md` — version MVP septembre 2026.
- `docs/security/security-requirements.md` — référentiel de sécurité du projet.
- `docs/design-audit.md` et `docs/design-system.md` — sources design consultées pour les frontières du shell.
- `docs/implementation-plan.md` — F00 et règles de livraison.
- `docs/security/ai-access-policy.md` — politique d’accès appliquée, sans modification.
- Documentation officielle Next.js — format ESM `next.config.mjs`, consultée
  le 2026-09-03 faute de Context7 disponible dans la session.

## Fichiers principaux

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` et `tsconfig.base.json`.
- `apps/api/package.json`, `apps/api/tsconfig.json` et `apps/api/src/`.
- `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.mjs`,
  `apps/web/app/` et `apps/web/public/branding/logo.svg`.
- `docker-compose.yml`, `.dockerignore`, `.env.example`, les Dockerfiles web/API
  et `docker/postgres/healthcheck.sh`.
- `tests/infrastructure/compose-config.test.ts`.
- `packages/shared/` et `packages/database/`.
- `tests/architecture/workspace.test.ts`.
- `tests/architecture/database-boundary.test.ts` et son helper.

## Limites connues

- La connectivité PostgreSQL réelle reste à confirmer dans un environnement de
  test dédié ; la pile Docker et le proxy local sont en place.
- L’API actuelle se limite à la santé technique ; aucune route métier n’est
  incluse.
- La protection de la frontière database est un garde-fou d’architecture par
  test ; elle devra être complétée par les configurations de build des apps.

## Travaux reportés

- Authentification Discord et sessions — F01.
- Modèle métier et migrations — fonctionnalités F01/F02 et suivantes.
- UI fonctionnelle et responsive — fonctionnalités applicatives puis F10.
- Release, sauvegardes et exploitation — F11.

## Vérification manuelle

### Prévue

Après implémentation : installer avec pnpm, démarrer Compose, vérifier les healthchecks, ouvrir `/`, appeler `/api/health`, puis contrôler les logs et la présence de fichiers interdits.

### Réalisée

- Vérification documentaire et de branche réalisée le 2026-09-02.
- Construction des images, démarrage avec attente et observation des quatre
  healthchecks verts le 2026-09-03 ; arrêt sans suppression du volume de
  développement.

### Restante

- Exécution réelle de la CI GitHub et scan Docker Scout à confirmer après PR.

## Commits importants

- `bc49b0f chore: scaffold pnpm workspace`.
- `f99f100 test: enforce workspace dependency boundaries`.
- `b6007c3 chore: define shared package boundaries`.
- `62a1edc feat: add Hono health endpoint`.
- `e503d58 fix: harden Hono API bootstrap`.
- `02e5d2d feat: add Next.js web shell`.
- `8f42fe1 feat: add same-origin caddy routing`.
- `458fd58 feat: add validated drizzle database boundary`.
- `83bdf04 fix: harden api limits and container images`.
- `14e70ca ci: add pinned quality and security gates`.

## Décisions associées

- [`001-develop-integration-branch.md`](../decisions/001-develop-integration-branch.md) — branche `develop` de test et PR de fonctionnalité vers `develop`.

## Évolutions datées

| Date | Évolution | Impact | Référence |
| --- | --- | --- | --- |
| 2026-09-02 | Création de la conception F00 et de la branche de travail | F00 passe en `IN_PROGRESS` ; aucun code encore livré | Conception F00 |
