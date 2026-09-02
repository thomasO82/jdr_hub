# Conception F00 — Socle monorepo, Docker et CI sécurisée

## Statut de la conception

Approuvée pour le plan d’implémentation et le code le 2026-09-02.

## Objectif

F00 fournit le socle technique reproductible du MVP JDR Hub. Il doit permettre d’installer le monorepo, de démarrer le web, l’API et PostgreSQL, de vérifier le routage par chemin sous un même domaine local et de refuser en CI les erreurs de qualité ou de sécurité évidentes.

F00 ne livre aucune fonctionnalité métier et ne crée aucune migration métier.

## Périmètre

### Inclus

- Workspace pnpm avec TypeScript strict.
- `apps/web` : Next.js App Router et page technique minimale.
- `apps/api` : Hono REST et endpoint `GET /api/health`.
- `packages/shared` : emplacement des contrats réellement partagés.
- `packages/database` : préparation Drizzle/PostgreSQL sans schéma métier définitif.
- `packages/ui` uniquement si une primitive est nécessaire au shell technique.
- Docker Compose avec `web-next`, `api-hono`, `postgres` et un reverse proxy local pour `/` et `/api/*`.
- `.env.example` factice, `.dockerignore`, images épinglées, builds multi-stage, healthchecks et conteneurs applicatifs non-root.
- CI GitHub Actions : installation reproductible, audit pnpm, lint, TypeScript, tests, builds, scan de secrets, analyse statique et scan d’images.
- Documentation de démarrage et commandes de vérification.

### Exclus

- OAuth Discord, sessions et matrice d’autorisation métier.
- Tables métier, migrations applicatives et données de production.
- Parties, tags, candidatures, invitations, séances, disponibilités, planning, notifications et XP.
- Interface fonctionnelle, VTT, chat, calendrier externe et déploiement de production.

## Architecture proposée

```text
Navigateur
    │ HTTP local
    ▼
Reverse proxy
    ├── /       → web-next (Next.js)
    └── /api/*  → api-hono (Hono)
                       │
                       └── réseau Docker interne → postgres
```

Le reverse proxy est la frontière qui garantit le comportement same-origin du développement local. PostgreSQL n’a pas de port public par défaut et n’est accessible qu’aux services qui en ont besoin. Le frontend ne reçoit jamais le package de base de données et ne l’importe pas dans du code exécuté dans le navigateur.

Le workspace racine expose des scripts cohérents pour installer, vérifier, tester et builder tous les packages. Chaque application conserve ses responsabilités : Next.js rend l’interface et Hono porte l’API REST. Aucun microservice n’est introduit.

## Flux principaux

### Démarrage local

1. Le développeur copie uniquement les noms de variables depuis `.env.example` et fournit les valeurs par l’environnement local prévu.
2. `pnpm install --frozen-lockfile` installe le workspace sans mutation implicite du lockfile.
3. Docker Compose démarre PostgreSQL, Hono, Next.js et le reverse proxy.
4. Les healthchecks valident la disponibilité de chaque service.
5. `/` est servi par Next.js et `/api/health` par Hono sous le même domaine local.

### Vérification CI

1. La CI installe avec le lockfile et des permissions minimales.
2. Les tests d’architecture et smoke tests exécutent les critères F00.
3. Lint, TypeScript, tests et builds sont exécutés pour le workspace et les deux applications.
4. Les dépendances, secrets, code et images sont analysés par des outils épinglés et configurés sans afficher de valeur sensible.
5. Toute étape critique en échec bloque la Pull Request vers `develop`.

## Tests d’abord

Avant le code de production, les tests suivants seront écrits :

- frontière workspace et absence d’import navigateur de `packages/database` ;
- réponse et format de `GET /api/health` ;
- routage same-origin de `/` et `/api/*` ;
- validation de configuration sans secret ;
- échec CI pour secret détecté, image non épinglée et conteneur root lorsque les outils sont disponibles.

La preuve TDD consignera les commandes et résultats Red, Green et Refactor dans `docs/features/001-monorepo-foundation.md` et la Pull Request.

## Sécurité et erreurs

- Les fichiers `.env`, clés, certificats, dumps et bases locales restent exclus et ne sont jamais inspectés par Codex.
- `.env.example` contient uniquement des valeurs factices.
- Les images sont épinglées ; les conteneurs applicatifs utilisent un utilisateur non-root, des capacités minimales et un système de fichiers aussi restrictif que possible.
- PostgreSQL est isolé sur un réseau Docker interne et utilise un compte applicatif à privilèges minimaux lorsque la connexion applicative est ajoutée.
- Les erreurs Hono utilisent un format stable avec `requestId`, sans stack trace, chemin interne, cookie, token, secret ou requête SQL.
- La taille du corps HTTP et les paramètres de santé sont limités selon le besoin du socle.
- Les workflows CI utilisent des permissions minimales et n’impriment jamais de secret détecté.

## Vérifications d’acceptation

- `pnpm install --frozen-lockfile` est reproductible.
- Les services `web-next`, `api-hono` et `postgres` démarrent avec des healthchecks exploitables.
- `/` et `/api/health` sont accessibles sous le même domaine de développement.
- Les builds web et API sont séparés et reproductibles.
- La CI bloque les erreurs de lint, TypeScript, tests, build, secret, analyse statique et scan d’image prévues.
- Aucun secret, build, `node_modules`, fichier parasite ou fichier `Zone.Identifier` n’est suivi.
- Aucun modèle métier ni migration métier n’est ajouté par F00.

## Workflow Git

La branche `chore/monorepo-foundation` est créée depuis `develop`. Sa Pull Request ciblera `develop`. Après validation et fusion par le propriétaire, `develop` sera testée avant une éventuelle promotion séparée vers `main`. Cette décision est enregistrée dans [`docs/decisions/001-develop-integration-branch.md`](../../decisions/001-develop-integration-branch.md).

## Risques et limites

- Le reverse proxy local ajoute une étape d’exécution ; il est conservé car il vérifie réellement le routage same-origin requis.
- Les outils de scan peuvent varier selon leur disponibilité dans l’environnement CI ; leurs versions et limites seront documentées dans la fiche F00.
- F00 ne prouve pas encore la sécurité OAuth, les permissions métier, la confidentialité des données applicatives ou les invariants de concurrence ; ces contrôles appartiennent aux fonctionnalités suivantes.

## Fichiers prévus

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `apps/web/**`, `apps/api/**`, `packages/shared/**`, `packages/database/**` et éventuellement `packages/ui/**`.
- `docker-compose.yml`, Dockerfiles et `.dockerignore`.
- `.github/workflows/**` et documentation de démarrage.

Ces chemins sont une cible de conception, pas une preuve d’implémentation existante.
